import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username:
          RandomGenerator.alphaNumeric(6) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Retrieve email verification records
  const response: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is within valid range",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify default pagination limit is 20 records per page
  TestValidator.equals(
    "default pagination limit is 20",
    response.pagination.limit,
    20,
  );
  // 5. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 6. Verify each verification record structure (validated by typia.assert)
  for (const record of response.data) {
    // Verify record contains required fields through business logic validation
    TestValidator.predicate("record has valid id", record.id !== undefined);
    TestValidator.predicate(
      "record has valid email",
      record.email !== undefined,
    );
    TestValidator.predicate(
      "record has valid created_at",
      record.created_at !== undefined,
    );
    TestValidator.predicate(
      "record has valid updated_at",
      record.updated_at !== undefined,
    );
    TestValidator.predicate(
      "record has valid expires_at",
      record.expires_at !== undefined,
    );
    TestValidator.predicate(
      "record has valid deleted_at",
      record.deleted_at !== undefined,
    );
    TestValidator.predicate(
      "record has valid member",
      record.member !== undefined,
    );
    // Verify member summary contains required fields
    TestValidator.predicate(
      "member has valid id",
      record.member.id !== undefined,
    );
    TestValidator.predicate(
      "member has valid username",
      record.member.username !== undefined,
    );
    TestValidator.predicate(
      "member has valid karma",
      record.member.karma !== undefined,
    );
    TestValidator.predicate(
      "member has valid created_at",
      record.member.created_at !== undefined,
    );
  }
  // 7. Verify sorting by created_at descending (newest first)
  if (response.data.length >= 2) {
    const firstRecordCreatedAt = new Date(
      response.data[0].created_at,
    ).getTime();
    const secondRecordCreatedAt = new Date(
      response.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "records sorted by created_at descending",
      firstRecordCreatedAt >= secondRecordCreatedAt,
    );
  }
}
