import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_announcements_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community ID since we cannot create communities
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Filter by status = 'published'
  const publishedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          status: "published",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(publishedResults);
  // Verify all returned announcements have status 'published'
  for (const announcement of publishedResults.data) {
    TestValidator.equals(
      "announcement status should be published",
      announcement.status,
      "published",
    );
  }
  // Test 2: Filter by status = 'draft'
  const draftResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          status: "draft",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(draftResults);
  for (const announcement of draftResults.data) {
    TestValidator.equals(
      "announcement status should be draft",
      announcement.status,
      "draft",
    );
  }
  // Test 3: Filter by status = 'archived'
  const archivedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          status: "archived",
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(archivedResults);
  for (const announcement of archivedResults.data) {
    TestValidator.equals(
      "announcement status should be archived",
      announcement.status,
      "archived",
    );
  }
  // Test 4: Filter by is_pinned = true
  const pinnedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          is_pinned: true,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(pinnedResults);
  for (const announcement of pinnedResults.data) {
    TestValidator.predicate(
      "announcement should be pinned",
      announcement.is_pinned === true,
    );
  }
  // Test 5: Filter by is_pinned = false
  const notPinnedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          is_pinned: false,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(notPinnedResults);
  for (const announcement of notPinnedResults.data) {
    TestValidator.predicate(
      "announcement should not be pinned",
      announcement.is_pinned === false,
    );
  }
  // Test 6: Combined filtering with status and search term
  const searchTerm = RandomGenerator.alphabets(5);
  const combinedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          status: "published",
          search: searchTerm,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate status filter still applies
  for (const announcement of combinedResults.data) {
    TestValidator.equals(
      "announcement status should be published when filtered",
      announcement.status,
      "published",
    );
    // Note: We cannot validate search term matching because we don't have access to title/content
  }
  // Test 7: Pagination parameters
  const paginatedResults =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current should be 1",
    paginatedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    paginatedResults.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedResults.data.length <= 10,
  );
}
