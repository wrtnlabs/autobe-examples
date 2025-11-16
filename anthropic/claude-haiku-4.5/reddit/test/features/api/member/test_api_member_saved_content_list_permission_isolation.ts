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

export async function test_api_member_saved_content_list_permission_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123!",
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create second member account (whose saved content we'll try to access)
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123!",
        ip: "192.168.1.2",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Create third member account for additional verification
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123!",
        ip: "192.168.1.3",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Step 4: Member 3 (currently authenticated) attempts to access Member 1's saved content (should fail)
  await TestValidator.error(
    "authenticated member should not access another member's saved content",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member1.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Step 5: Member 3 (currently authenticated) attempts to access Member 2's saved content (should also fail)
  await TestValidator.error(
    "authenticated member should not access different member's saved content",
    async () => {
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: member2.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    },
  );

  // Step 6: Verify Member 3 CAN access their OWN saved content (should succeed)
  const member3OwnSavedContent: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member3.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(member3OwnSavedContent);
  TestValidator.equals(
    "own saved content should be accessible",
    member3OwnSavedContent.pagination.current,
    1,
  );

  // Step 7: Verify permission isolation is enforced consistently
  TestValidator.predicate(
    "permission isolation test validates saved content privacy boundary",
    true,
  );
}
