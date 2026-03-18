import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_employee_refresh_inactive_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(joined);
  const mutatedRefresh: string = `${joined.token.refresh}.${RandomGenerator.alphaNumeric(8)}`;
  const randomRefresh: string = RandomGenerator.alphaNumeric(64);
  const invalidatedSessionConnectionA: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "refresh rejects mutated token without leaking internals",
    async () => {
      try {
        await authorize_employee_refresh(invalidatedSessionConnectionA, {
          body: {
            refresh: mutatedRefresh,
          } satisfies IHrmTimeTrackingEmployee.IRefresh,
        });
      } catch (exp) {
        TestValidator.predicate(
          "mutated token refresh fails with auth-style error",
          exp instanceof api.HttpError &&
            [400, 401, 403, 404].includes(exp.status),
        );
        if (exp instanceof api.HttpError) {
          const json = exp.toJSON<unknown>();
          const rawMessage: string =
            typeof json.message === "string"
              ? json.message
              : JSON.stringify(json.message);
          const normalizedMessage: string = rawMessage.toLowerCase();
          TestValidator.predicate(
            "mutated token error message hides internal token details",
            !normalizedMessage.includes("expired_at") &&
              !normalizedMessage.includes("logged_out_at") &&
              !normalizedMessage.includes("session") &&
              !normalizedMessage.includes("jwt") &&
              !normalizedMessage.includes("signature") &&
              !normalizedMessage.includes("database"),
          );
        }
        throw exp;
      }
    },
  );
  const invalidatedSessionConnectionB: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "refresh rejects random token without leaking internals",
    async () => {
      try {
        await authorize_employee_refresh(invalidatedSessionConnectionB, {
          body: {
            refresh: randomRefresh,
          } satisfies IHrmTimeTrackingEmployee.IRefresh,
        });
      } catch (exp) {
        TestValidator.predicate(
          "random token refresh fails with auth-style error",
          exp instanceof api.HttpError &&
            [400, 401, 403, 404].includes(exp.status),
        );
        if (exp instanceof api.HttpError) {
          const json = exp.toJSON<unknown>();
          const rawMessage: string =
            typeof json.message === "string"
              ? json.message
              : JSON.stringify(json.message);
          const normalizedMessage: string = rawMessage.toLowerCase();
          TestValidator.predicate(
            "random token error message hides internal token details",
            !normalizedMessage.includes("expired_at") &&
              !normalizedMessage.includes("logged_out_at") &&
              !normalizedMessage.includes("session") &&
              !normalizedMessage.includes("jwt") &&
              !normalizedMessage.includes("signature") &&
              !normalizedMessage.includes("database"),
          );
        }
        throw exp;
      }
    },
  );
}
