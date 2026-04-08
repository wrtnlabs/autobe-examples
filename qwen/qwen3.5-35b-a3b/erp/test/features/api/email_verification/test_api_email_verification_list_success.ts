import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call the list endpoint with default parameters
  // Note: We cannot create email verification tokens via SDK, so we test with actual data
  const response =
    await api.functional.hrmPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals(
    "limit is positive",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "records is non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages matches records/limit",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate response structure matches IPageIHrmPlatformMemberEmailVerification.ISummary
  typia.assert(response);
  // 5. Validate each record has required fields and correct boolean flags
  for (const record of response.data) {
    typia.assert(record);
    // Required fields must exist
    TestValidator.notEquals("id field exists", record.id, undefined);
    TestValidator.notEquals("token field exists", record.token, undefined);
    TestValidator.notEquals(
      "expires_at field exists",
      record.expires_at,
      undefined,
    );
    TestValidator.notEquals("used_at field exists", record.used_at, undefined);
    TestValidator.notEquals(
      "created_at field exists",
      record.created_at,
      undefined,
    );
    TestValidator.notEquals(
      "updated_at field exists",
      record.updated_at,
      undefined,
    );
    TestValidator.notEquals(
      "deleted_at field exists",
      record.deleted_at,
      undefined,
    );
    // Member reference must exist
    TestValidator.notEquals(
      "member reference exists",
      record.member,
      undefined,
    );
    typia.assert(record.member);
    // Boolean flags must be valid
    TestValidator.predicate(
      "is_pending is boolean",
      typeof record.is_pending === "boolean",
    );
    TestValidator.predicate(
      "is_verified is boolean",
      typeof record.is_verified === "boolean",
    );
    TestValidator.predicate(
      "is_expired is boolean",
      typeof record.is_expired === "boolean",
    );
    TestValidator.predicate(
      "is_deleted is boolean",
      typeof record.is_deleted === "boolean",
    );
    // Flag logic: soft-deleted records should have is_deleted = true
    if (record.deleted_at !== null) {
      TestValidator.equals(
        `soft-deleted record has is_deleted=true`,
        record.is_deleted,
        true,
      );
    }
    // Flag logic: used tokens should have is_verified = true
    if (record.used_at !== null) {
      TestValidator.equals(
        `used record has is_verified=true`,
        record.is_verified,
        true,
      );
    }
  }
  // 6. Validate soft-deleted records are excluded by default
  const deletedRecords = response.data.filter((r) => r.is_deleted === true);
  TestValidator.equals(
    "no soft-deleted records in default list",
    deletedRecords.length,
    0,
  );
  // 7. Validate sorting: should be sorted by created_at DESC
  for (let i = 1; i < response.data.length; i++) {
    const prevCreatedAt = new Date(response.data[i - 1].created_at).getTime();
    const currCreatedAt = new Date(response.data[i].created_at).getTime();
    TestValidator.predicate(
      `record ${i} is sorted by created_at DESC`,
      prevCreatedAt >= currCreatedAt,
    );
  }
}