import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminPasswordReset";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_resets_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(2),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call password-resets endpoint with default parameters
  const passwordResets =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResets);
  // 3. Validate pagination metadata exists and is correct
  TestValidator.predicate(
    "pagination current is valid",
    passwordResets.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within range",
    passwordResets.pagination.limit >= 1 &&
      passwordResets.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    passwordResets.pagination.records >= 0,
  );
  const expectedPages =
    passwordResets.pagination.records === 0
      ? 0
      : Math.ceil(
          passwordResets.pagination.records / passwordResets.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation correct",
    expectedPages satisfies number as number,
    passwordResets.pagination.pages,
  );
  // 4. Validate each record has required fields and structure
  for (const record of passwordResets.data) {
    typia.assert(record);
    // Validate required fields exist
    TestValidator.predicate(
      "record has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.id,
      ),
    );
    TestValidator.predicate(
      "record has valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(record.email),
    );
    TestValidator.predicate(
      "record has valid expiresAt timestamp",
      !isNaN(Date.parse(record.expiresAt)),
    );
    TestValidator.predicate(
      "record has valid createdAt timestamp",
      !isNaN(Date.parse(record.createdAt)),
    );
    TestValidator.predicate(
      "record has valid updatedAt timestamp",
      !isNaN(Date.parse(record.updatedAt)),
    );
    // Validate usedAt is either null or valid date
    if (record.usedAt !== null) {
      TestValidator.predicate(
        "usedAt is valid date when not null",
        !isNaN(Date.parse(record.usedAt)),
      );
    }
    // Validate admin reference exists
    typia.assert(record.admin);
    TestValidator.predicate(
      "admin has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.admin.id,
      ),
    );
    TestValidator.predicate(
      "admin has email",
      record.admin.email !== undefined && record.admin.email.length > 0,
    );
    TestValidator.predicate(
      "admin has is_active boolean",
      typeof record.admin.is_active === "boolean",
    );
    // Validate token value is NOT included (security requirement)
    TestValidator.equals("token value not exposed", "token" in record, false);
    TestValidator.equals(
      "value property not exposed",
      "value" in record,
      false,
    );
  }
  // 5. Validate records are sorted by createdAt descending (newest first)
  if (passwordResets.data.length > 1) {
    for (let i = 1; i < passwordResets.data.length; i++) {
      TestValidator.predicate(
        `record ${i} is newer than record ${i - 1}`,
        new Date(passwordResets.data[i].createdAt).getTime() <=
          new Date(passwordResets.data[i - 1].createdAt).getTime(),
      );
    }
  }
  // 6. Test with different limit values
  // Test with limit = 5
  const limitedPasswordResets =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(limitedPasswordResets);
  TestValidator.equals(
    "limit set to 5",
    limitedPasswordResets.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "returned records within limit",
    limitedPasswordResets.data.length <= 5,
  );
  // Test with limit = 1
  const singleLimitPasswordResets =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(singleLimitPasswordResets);
  TestValidator.equals(
    "limit set to 1",
    singleLimitPasswordResets.pagination.limit,
    1,
  );
  // Test with limit = 100 (maximum)
  const maxLimitPasswordResets =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(maxLimitPasswordResets);
  TestValidator.equals(
    "limit set to 100",
    maxLimitPasswordResets.pagination.limit,
    100,
  );
}
