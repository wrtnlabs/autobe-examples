import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsNotification";

/**
 * Validate notification search and idempotent batch-update by the notification
 * recipient.
 *
 * Workflow:
 *
 * 1. Create two test members (alice, bob) using POST /auth/communityMember/join
 * 2. As alice: create a community, optionally upload media, and create a post
 * 3. As bob: create a comment on alice's post to trigger a notification targeting
 *    alice
 * 4. As alice: search notifications (PATCH
 *    /communityBbs/communityMember/notifications) and locate notification for
 *    the comment
 * 5. Batch-update the notification(s) marking them delivered; assert mutation and
 *    idempotency
 * 6. Negative tests: unauthenticated access and cross-recipient mutation attempts
 */
export async function test_api_notifications_search_and_batch_update_by_recipient(
  connection: api.IConnection,
) {
  // 1) Create per-actor connections (do NOT mutate original connection.headers)
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };

  // Create distinctive identities
  const now = Date.now();
  const aliceUsername = `alice_${now}_${RandomGenerator.alphaNumeric(4)}`;
  const bobUsername = `bob_${now}_${RandomGenerator.alphaNumeric(4)}`;
  const aliceEmail = `alice.${now}@example.test`;
  const bobEmail = `bob.${now}@example.test`;

  // 2) Alice: join
  const aliceAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(aliceConn, {
      body: {
        email: aliceEmail,
        username: aliceUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/entry",
          referrer: "http://example.test/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(aliceAuth);

  // 3) Alice: create a community with a unique slug
  const communitySlug = `test-community-${now}-${RandomGenerator.alphaNumeric(4)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      aliceConn,
      {
        body: {
          name: `E2E Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
          slug: communitySlug,
          description: "E2E test community for notifications",
          visibility: "public",
          post_approval_required: false,
          settings: {
            visibility: "public",
            require_post_approval: false,
            max_images_per_post: 3,
            allowed_image_mime_types: ["image/jpeg", "image/png"],
          } satisfies ICommunityBbsCommunity.ISettings.ICreate,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 4) Alice: optional upload media to attach to the post
  const media: ICommunityBbsPostMedia =
    await api.functional.communityBbs.communityMember.uploads.create(
      aliceConn,
      {
        body: {
          upload_mode: "url",
          url: `https://cdn.example.test/${RandomGenerator.alphaNumeric(8)}.jpg`,
          media_type: "image/jpeg",
          size_bytes: 1024,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(media);

  // 5) Alice: create a post referencing uploaded media
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      aliceConn,
      {
        communitySlug: communitySlug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "image",
          media_ids: [media.id],
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    communitySlug,
  );

  // 6) Bob: join
  const bobAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(bobConn, {
      body: {
        email: bobEmail,
        username: bobUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/entry",
          referrer: "http://example.test/ref",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(bobAuth);

  // 7) Bob: create a comment on Alice's post to generate a notification
  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      bobConn,
      {
        postId: post.id,
        body: {
          body: "Nice post! This should trigger a notification to the author.",
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8) Primary validation: Alice searches her notifications
  const searchRequest = {
    pagination: { page: 1, limit: 10 },
    sort: "created_at.desc",
  } satisfies ICommunityBbsNotification.IRequest;

  const page: IPageICommunityBbsNotification.ISummary =
    await api.functional.communityBbs.communityMember.notifications.index(
      aliceConn,
      {
        body: searchRequest,
      },
    );
  typia.assert(page);

  // Find notification(s) linked to the post
  const matched = page.data.filter((n) => n.target_id === post.id);
  TestValidator.predicate(
    "notification for bob's comment exists",
    matched.length > 0,
  );

  // 9) Batch update: Alice marks the notification(s) as delivered
  const idsToUpdate = matched.map((m) => m.id);
  if (idsToUpdate.length === 0) return; // Nothing to update; test ends early

  const deliveredAt = new Date().toISOString();
  const batchRequest = {
    batchUpdate: {
      ids: idsToUpdate,
      patch: {
        status: "delivered",
        delivered_at: deliveredAt,
      },
    },
    pagination: { page: 1, limit: 10 },
  } satisfies ICommunityBbsNotification.IRequest;

  const afterUpdate: IPageICommunityBbsNotification.ISummary =
    await api.functional.communityBbs.communityMember.notifications.index(
      aliceConn,
      {
        body: batchRequest,
      },
    );
  typia.assert(afterUpdate);

  // Ensure the updated notifications reflect delivered_at/status
  const updatedMap = new Map<string, ICommunityBbsNotification.ISummary>();
  for (const n of afterUpdate.data) updatedMap.set(n.id, n);

  for (const id of idsToUpdate) {
    const updated = updatedMap.get(id);
    TestValidator.predicate(
      `notification ${id} has been updated to delivered`,
      updated !== undefined &&
        updated.delivered_at !== null &&
        updated.status === "delivered",
    );
  }

  // 10) Authorization negative test: unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search notifications",
    async () => {
      await api.functional.communityBbs.communityMember.notifications.index(
        unauthConn,
        {
          body: {
            pagination: { page: 1, limit: 5 },
          } satisfies ICommunityBbsNotification.IRequest,
        },
      );
    },
  );

  // 11) Ownership enforcement negative test: bob cannot batch-update alice's notifications
  await TestValidator.error(
    "other user cannot batch-update another recipient's notifications",
    async () => {
      await api.functional.communityBbs.communityMember.notifications.index(
        bobConn,
        {
          body: {
            batchUpdate: {
              ids: idsToUpdate,
              patch: {
                status: "delivered",
                delivered_at: new Date().toISOString(),
              },
            },
          } satisfies ICommunityBbsNotification.IRequest,
        },
      );
    },
  );

  // 12) Idempotency: re-apply the same batch update as alice and assert stability
  const secondUpdate: IPageICommunityBbsNotification.ISummary =
    await api.functional.communityBbs.communityMember.notifications.index(
      aliceConn,
      {
        body: batchRequest,
      },
    );
  typia.assert(secondUpdate);

  // Delivered timestamps must remain consistent for the affected ids
  const secondMap = new Map<string, ICommunityBbsNotification.ISummary>();
  for (const n of secondUpdate.data) secondMap.set(n.id, n);

  for (const id of idsToUpdate) {
    const first = updatedMap.get(id);
    const second = secondMap.get(id);
    TestValidator.equals(
      `delivered_at stable after idempotent update for ${id}`,
      second?.delivered_at ?? null,
      first?.delivered_at ?? null,
    );
  }

  // 13) Ensure no cross-recipient side-effects: Bob's notifications should not include alice's ids
  const bobPage: IPageICommunityBbsNotification.ISummary =
    await api.functional.communityBbs.communityMember.notifications.index(
      bobConn,
      {
        body: {
          pagination: { page: 1, limit: 20 },
        } satisfies ICommunityBbsNotification.IRequest,
      },
    );
  typia.assert(bobPage);
  TestValidator.predicate(
    "no cross-recipient modification: bob's notifications do not contain alice ids",
    bobPage.data.every((n) => !idsToUpdate.includes(n.id)),
  );
}
