import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Validate filtered retrieval of post edit histories by editor and time range.
 *
 * Business focus:
 *
 * - Ensure the edit history listing endpoint for a specific post accepts and
 *   correctly processes filter and pagination parameters defined in
 *   ICommunityPlatformPostEditHistory.IRequest.
 * - Because there is no explicit API to mutate posts and thereby create
 *   guaranteed history snapshots, this scenario is rewritten as a read-oriented
 *   robustness test that focuses on request/response typing, pagination, and
 *   basic invariant checks on any data that is returned.
 *
 * Flow:
 *
 * 1. Register a memberUser using auth.memberUser.join. This establishes the
 *    authenticated context used for all subsequent memberUser-scoped calls.
 * 2. Create a community via communityPlatform.memberUser.communities.create using
 *    a random, valid ICommunityPlatformCommunity.ICreate body.
 * 3. Create a post via communityPlatform.memberUser.posts.create in that community
 *    with a random, valid ICommunityPlatformPost.ICreate body.
 * 4. Capture a reference timestamp `now` as an ISO date-time string. This serves
 *    as both the editor filter reference (via the current user id) and the
 *    default edited_from/edited_to window.
 * 5. Call PATCH /communityPlatform/memberUser/posts/{postId}/editHistories via
 *    api.functional.communityPlatform.memberUser.posts.editHistories.index
 *    with:
 *
 *    - PostId: id of the created post
 *    - Body: { page: 1, limit: 10, sort_direction: "desc", editor_memberuser_id:
 *         authorized.id, edited_from: editedFrom, edited_to: editedTo }
 *         satisfies ICommunityPlatformPostEditHistory.IRequest This constructs
 *         a very tight time window that may or may not include any actual
 *         history records; the test remains valid in both cases.
 * 6. Assert the response type using typia.assert, then validate core pagination
 *    invariants: limit must match the request, current must equal the requested
 *    page, records must be >= data.length, and pages must be
 *
 * > = 0.
 *
 * 7. If the response contains any history entries, additionally assert for each
 *    entry that:
 *
 *    - Summary.post_id === post.id
 *    - Summary.created_at is between edited_from and edited_to (inclusive) Because
 *         editor is optional, do not require editor or editor.id to be
 *         populated, and do not attempt to assert editor.id equality.
 * 8. Perform a second call using a time range that is extremely unlikely to
 *    intersect with any edits for this newly created post (for example, a
 *    window in the distant past). Use a small page/limit such as page=1 and
 *    limit=5. The test cannot strictly guarantee that the backend has no data
 *    in this range, but it can still assert type correctness, and if the data
 *    array is empty, it additionally asserts pagination.records === 0.
 *
 * This test intentionally avoids any type-error scenarios and does not rely on
 * non-existent edit-creation APIs. It focuses solely on correct handling of the
 * IRequest filter fields and the structural integrity of the paginated
 * response.
 */
export async function test_api_post_edit_history_filtered_by_editor_and_time_range(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (author)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Capture reference timestamps
  const nowDate: Date = new Date();
  const editedFrom: string = new Date(nowDate.getTime() - 1_000).toISOString();
  const editedTo: string = new Date(nowDate.getTime() + 1_000).toISOString();

  // 5. First call: filter by editor and tight time range, page=1, limit=10
  const firstRequestBody = {
    page: 1,
    limit: 10,
    sort_direction: "desc" as const,
    editor_memberuser_id: authorized.id,
    edited_from: editedFrom,
    edited_to: editedTo,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const firstPage: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.memberUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  // 6. Validate pagination invariants
  const firstPagination: IPage.IPagination = firstPage.pagination;
  TestValidator.equals(
    "first call: pagination.limit matches request",
    firstRequestBody.limit,
    firstPagination.limit,
  );
  TestValidator.equals(
    "first call: pagination.current matches request page",
    firstRequestBody.page,
    firstPagination.current,
  );
  TestValidator.predicate(
    "first call: pagination.records >= data length",
    firstPagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first call: pagination.pages is non-negative",
    firstPagination.pages >= 0,
  );

  // 7. If any histories exist, validate post_id and created_at within range
  for (const summary of firstPage.data) {
    const item: ICommunityPlatformPostEditHistory.ISummary = summary;

    TestValidator.equals(
      "first call: history.post_id matches post.id",
      post.id,
      item.post_id,
    );

    const createdTime = new Date(item.created_at).getTime();
    const fromTime = new Date(editedFrom).getTime();
    const toTime = new Date(editedTo).getTime();
    TestValidator.predicate(
      "first call: history.created_at within [edited_from, edited_to]",
      createdTime >= fromTime && createdTime <= toTime,
    );
  }

  // 8. Second call: use a far past time window that is extremely unlikely to
  // intersect with any edits for this newly created post. We still cannot
  // strictly assert that no data will be returned, but if the result set is
  // empty, we assert records === 0.
  const pastFrom = new Date(2000, 0, 1).toISOString();
  const pastTo = new Date(2000, 0, 2).toISOString();

  const secondRequestBody = {
    page: 1,
    limit: 5,
    sort_direction: "desc" as const,
    editor_memberuser_id: authorized.id,
    edited_from: pastFrom,
    edited_to: pastTo,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const secondPage: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.memberUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondPagination: IPage.IPagination = secondPage.pagination;
  TestValidator.equals(
    "second call: pagination.limit matches request",
    secondRequestBody.limit,
    secondPagination.limit,
  );
  TestValidator.equals(
    "second call: pagination.current matches request page",
    secondRequestBody.page,
    secondPagination.current,
  );
  TestValidator.predicate(
    "second call: pagination.records >= data length",
    secondPagination.records >= secondPage.data.length,
  );

  if (secondPage.data.length === 0) {
    TestValidator.predicate(
      "second call: when data is empty, records equals 0",
      secondPagination.records === 0,
    );
  }
}
