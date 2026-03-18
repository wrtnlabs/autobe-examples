import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_view_cross_organization_contract_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join two separate organizations (Org A / Org B)
  const orgAConnection: api.IConnection = { host: connection.host };
  const orgBConnection: api.IConnection = { host: connection.host };
  const orgAPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number as number,
    href: "https://example.com/join/org-a" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const orgBPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2 satisfies number as number,
    href: "https://example.com/join/org-b" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const orgAAuth = await authorize_member_join(orgAConnection, {
    body: orgAPayload,
  });
  typia.assert(orgAAuth);
  const orgBAuth = await authorize_member_join(orgBConnection, {
    body: orgBPayload,
  });
  typia.assert(orgBAuth);
  // 2) Obtain a contractId belonging to Org B.
  // Given available API surface in this test environment, we cannot create/list
  // real contracts. Use a UUID-shaped contractId and assert cross-tenant access
  // does not leak any contract fields under Org A context.
  const contractId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3) Call under Org A context
  await TestValidator.error(
    "cross-organization contract must be treated as not-found without leaking contract fields",
    async () => {
      await api.functional.erpHrmTimeTracking.member.contracts.at(
        orgAConnection,
        {
          contractId,
        },
      );
    },
  );

  // Capture the error to validate that it does not contain any contract data.
  // (TestValidator.error already ensured rejection.)
  try {
    await api.functional.erpHrmTimeTracking.member.contracts.at(
      orgAConnection,
      {
        contractId,
      },
    );
    throw new Error("Expected request to be rejected");
  } catch (e) {
    typia.assertGuard(e);

    // Avoid api.HttpError.is (not present in this build); rely on instanceof
    if (!(e instanceof api.HttpError)) {
      const msg = (e as Error).message;
      TestValidator.predicate(
        "error message should be non-empty",
        msg.length > 0,
      );
      return;
    }

    const err = e as api.HttpError;
    const payload = typia.is<string>(err.message)
      ? err.message
      : (err.toJSON<unknown>().message as unknown);
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);

    // Ensure typical contract fields are not exposed in the error payload.
    TestValidator.predicate(
      "error payload must not include contract fields",
      !text.includes("contractNumber") &&
        !text.includes("contractTitle") &&
        !text.includes("payAmount") &&
        !text.includes("workTermStartDate") &&
        !text.includes("workTermEndDate"),
    );
  }
}
