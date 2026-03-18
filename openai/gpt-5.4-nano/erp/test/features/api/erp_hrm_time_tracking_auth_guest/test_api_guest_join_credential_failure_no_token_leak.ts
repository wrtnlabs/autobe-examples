import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_credential_failure_no_token_leak(
  connection: api.IConnection,
): Promise<void> {
  // Use a syntactically valid email and a password to ensure the identity exists.
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.Format<"password">>();
  const existingGuestConnection: api.IConnection = { host: connection.host };
  const existingAuth = await authorize_guest_join(existingGuestConnection, {
    body: {
      email,
      password: correctPassword,
    } satisfies IErpHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(existingAuth);
  const wrongPassword = typia.random<string & tags.Format<"password">>();
  const requestBody = {
    email,
    password: wrongPassword,
  } satisfies IErpHrmTimeTrackingGuest.IJoin;
  const safeErrorSnapshot = (
    error: unknown,
  ): {
    status: number;
    message: unknown;
    normalized: string;
  } => {
    if (!typia.is<api.HttpError>(error)) {
      throw error as Error;
    }
    const httpError = error;
    const message = httpError.toJSON<unknown>().message;
    const headers = httpError.headers;
    // Security: ensure no token/session artifacts exist in error body/headers.
    const bodyString = (() => {
      if (typeof message === "string") return message;
      try {
        return JSON.stringify(message);
      } catch {
        return String(message);
      }
    })();
    const forbiddenSubstrings = [
      "access",
      "refresh",
      "expired_at",
      "refreshable_until",
      '"token"',
      '"id"',
      "IAuthorized",
    ];
    TestValidator.predicate(
      "error must not leak authorization artifacts",
      () =>
        forbiddenSubstrings.every((s) => !bodyString.includes(s)) &&
        !Object.keys(headers).some((k) =>
          k.toLowerCase().includes("set-cookie"),
        ) &&
        !Object.keys(headers).some((k) =>
          k.toLowerCase().includes("authorization"),
        ),
    );
    return {
      status: httpError.status,
      message,
      normalized: bodyString,
    };
  };
  async function expectConsistentFailure(): Promise<{
    status: number;
    normalized: string;
  }> {
    const failureConnection: api.IConnection = { host: connection.host };
    let captured: unknown;
    try {
      await authorize_guest_join(failureConnection, {
        body: requestBody,
      });
      throw new Error("Expected guest join to fail, but it succeeded.");
    } catch (error) {
      captured = error;
    }
    const snapshot = safeErrorSnapshot(captured);
    TestValidator.predicate(
      "status should be 401 or 403",
      () => snapshot.status === 401 || snapshot.status === 403,
    );
    return {
      status: snapshot.status,
      normalized: snapshot.normalized,
    };
  }
  const first = await expectConsistentFailure();
  const second = await expectConsistentFailure();
  TestValidator.equals(
    "failure status should be consistent",
    first.status,
    second.status,
  );
  TestValidator.equals(
    "failure error payload should be consistent",
    first.normalized,
    second.normalized,
  );
}
