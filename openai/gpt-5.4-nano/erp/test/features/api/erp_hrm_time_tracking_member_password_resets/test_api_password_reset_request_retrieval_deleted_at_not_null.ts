import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_request_retrieval_deleted_at_not_null(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password_12345!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // NOTE: No API for creating/invalidating reset requests was provided.
  // This test therefore uses a random UUID as the candidate resetId and
  // validates the contract for cases where deleted_at is non-null.
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.erpHrmTimeTracking.member.password_resets.at(
      memberConnection,
      { resetId },
    );
  typia.assert(first);
  TestValidator.equals("id equals resetId", first.id, resetId);
  TestValidator.equals(
    "deleted_at is non-null",
    first.deleted_at !== null,
    true,
  );
  const second =
    await api.functional.erpHrmTimeTracking.member.password_resets.at(
      memberConnection,
      { resetId },
    );
  typia.assert(second);
  TestValidator.equals("read-only response id", second.id, first.id);
  TestValidator.equals(
    "read-only response deleted_at",
    second.deleted_at,
    first.deleted_at,
  );
  TestValidator.equals(
    "read-only response expired_at",
    second.expired_at,
    first.expired_at,
  );
}
