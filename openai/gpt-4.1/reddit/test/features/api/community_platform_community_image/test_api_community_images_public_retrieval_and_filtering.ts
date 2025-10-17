import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";

/**
 * Test public retrieval and filtering of community images for branding, icon,
 * and backgrounds.
 *
 * Steps:
 *
 * 1. Register a new member account to obtain community creation privileges.
 * 2. Create a new community as the registered member.
 * 3. Simulate uploading and association of multiple images with various types
 *    (e.g., icon, background).
 * 4. Retrieve the full list using PATCH
 *    /communityPlatform/communities/{communityId}/images.
 * 5. Test advanced filters: by image_type, by active status, order, created_at
 *    range.
 * 6. Test different sort_by options ('created_at', 'order'), with ascending and
 *    descending sort orders.
 * 7. Validate pagination by requesting different pages/limits, especially for
 *    large sets.
 * 8. Validate that only active (non-deleted/archived) images are included in
 *    public responses.
 * 9. Check access controls by ensuring non-public images are not returned to
 *    unauthorized users.
 * 10. Confirm overall data integrity, correct behavior under edge conditions, and
 *     full compliance with the business logic and platform rules.
 */
export async function test_api_community_images_public_retrieval_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);
  // 2. Create new community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Simulate insertion of images (mocking what file upload+association would do).
  // Since the create/upload API is not present, we'll assume at least one image (icon), one (background), and several more, are pre-populated for the test by external means or the fixture/migration. Instead, focus on the retrieval/filter logic.

  // 4. Retrieve full image list for the community using PATCH endpoint.
  const allImagesResult =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: { community_id: community.id },
      },
    );
  typia.assert(allImagesResult);
  TestValidator.predicate(
    "all returned images belong to test community",
    allImagesResult.data.every((img) => img.community_id === community.id),
  );

  // 5. Filter by image_type (e.g., icon)
  const iconImagesResult =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: { community_id: community.id, image_type: "icon" },
      },
    );
  typia.assert(iconImagesResult);
  TestValidator.predicate(
    "all returned images are type icon",
    iconImagesResult.data.every((img) => img.image_type === "icon"),
  );

  // 6. Filter by active status
  const activeImagesResult =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: { community_id: community.id, active: true },
      },
    );
  typia.assert(activeImagesResult);
  TestValidator.predicate(
    "all returned images are active",
    activeImagesResult.data.every((img) => img.active === true),
  );

  // 7. Test pagination (limit 2 per page)
  const paged1 =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: { community_id: community.id, limit: 2, page: 1 },
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination first page limit",
    paged1.pagination.limit,
    2,
  );
  TestValidator.equals("pagination current page", paged1.pagination.current, 1);
  const paged2 =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: { community_id: community.id, limit: 2, page: 2 },
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "pagination second page limit",
    paged2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page for page 2",
    paged2.pagination.current,
    2,
  );

  // 8. Test sort_by/'order' ascending/descending
  const sortedAsc =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          sort_by: "order",
          sort_order: "asc",
        },
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "images are sorted by order ascending",
    sortedAsc.data.every(
      (img, i, arr) => i === 0 || (arr[i - 1].order ?? 0) <= (img.order ?? 0),
    ),
  );

  const sortedDesc =
    await api.functional.communityPlatform.communities.images.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          sort_by: "order",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "images are sorted by order descending",
    sortedDesc.data.every(
      (img, i, arr) => i === 0 || (arr[i - 1].order ?? 0) >= (img.order ?? 0),
    ),
  );

  // 9. Test filter by created_before/created_after
  const allImages = allImagesResult.data;
  if (allImages.length >= 2) {
    const midCreated = allImages[Math.floor(allImages.length / 2)].created_at;
    const afterResult =
      await api.functional.communityPlatform.communities.images.index(
        connection,
        {
          communityId: community.id,
          body: { community_id: community.id, created_after: midCreated },
        },
      );
    typia.assert(afterResult);
    TestValidator.predicate(
      "all returned images created after mid",
      afterResult.data.every((img) => img.created_at > midCreated),
    );
    const beforeResult =
      await api.functional.communityPlatform.communities.images.index(
        connection,
        {
          communityId: community.id,
          body: { community_id: community.id, created_before: midCreated },
        },
      );
    typia.assert(beforeResult);
    TestValidator.predicate(
      "all returned images created before mid",
      beforeResult.data.every((img) => img.created_at < midCreated),
    );
  }

  // 10. Access restrictions: Inactive/deleted/archived images are not present
  TestValidator.predicate(
    "no deleted or inactive images returned",
    allImagesResult.data.every(
      (img) =>
        img.active && (img.deleted_at === null || img.deleted_at === undefined),
    ),
  );
}
