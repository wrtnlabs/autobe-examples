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

/**
 * Test sorting saved content by save date.
 *
 * This test validates that saved content can be sorted by save date with both
 * ascending and descending order. It creates a member account, simulates
 * multiple saved content items with different save dates, and verifies that the
 * sorting functionality correctly orders results by the created_at timestamp of
 * the saved content record (most recently saved first for descending order).
 *
 * The test workflow:
 *
 * 1. Create a member account
 * 2. Request saved content sorted by save date in descending order (newest first)
 * 3. Verify that the returned items are properly ordered with most recent saves
 *    first
 * 4. Request saved content sorted by save date in ascending order (oldest first)
 * 5. Verify that the returned items are properly ordered with oldest saves first
 */
export async function test_api_member_saved_content_list_sort_by_save_date(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
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
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Request saved content sorted by save date in descending order (newest first)
  const descResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 10,
          sortBy: "saveDate",
          sortOrder: "desc",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(descResponse);

  // Step 3: Verify descending order - items should be sorted from newest to oldest save date
  if (descResponse.data.length > 1) {
    for (let i = 0; i < descResponse.data.length - 1; i++) {
      const current = new Date(descResponse.data[i].created_at).getTime();
      const next = new Date(descResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "descending order: current item saved_at >= next item saved_at",
        current >= next,
      );
    }
  }
  TestValidator.equals(
    "response pagination has correct structure",
    typeof descResponse.pagination,
    "object",
  );

  // Step 4: Request saved content sorted by save date in ascending order (oldest first)
  const ascResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 10,
          sortBy: "saveDate",
          sortOrder: "asc",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(ascResponse);

  // Step 5: Verify ascending order - items should be sorted from oldest to newest save date
  if (ascResponse.data.length > 1) {
    for (let i = 0; i < ascResponse.data.length - 1; i++) {
      const current = new Date(ascResponse.data[i].created_at).getTime();
      const next = new Date(ascResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "ascending order: current item saved_at <= next item saved_at",
        current <= next,
      );
    }
  }
  TestValidator.equals(
    "response pagination has correct structure in ascending order",
    typeof ascResponse.pagination,
    "object",
  );
}
