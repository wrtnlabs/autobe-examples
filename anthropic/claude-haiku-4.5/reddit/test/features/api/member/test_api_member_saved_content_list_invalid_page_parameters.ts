import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

export async function test_api_member_saved_content_list_invalid_page_parameters(
  connection: api.IConnection,
) {
  // Create member account for testing
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Test invalid page number (0)
  await TestValidator.error(
    "page parameter 0 should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 0,
            limit: 10,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test invalid page number (negative)
  await TestValidator.error(
    "negative page parameter should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: -1,
            limit: 10,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test invalid limit number (0)
  await TestValidator.error(
    "limit parameter 0 should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 1,
            limit: 0,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test invalid limit number (negative)
  await TestValidator.error(
    "negative limit parameter should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 1,
            limit: -5,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test limit exceeding maximum (101)
  await TestValidator.error(
    "limit parameter exceeding 100 should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 1,
            limit: 101,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test limit exceeding maximum significantly
  await TestValidator.error(
    "limit parameter far exceeding 100 should fail validation",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 1,
            limit: 1000,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Test valid parameters to ensure endpoint works
  const validResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(validResponse);
  TestValidator.predicate(
    "valid response should have pagination info",
    validResponse.pagination !== null && validResponse.pagination !== undefined,
  );
}
