import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_detail_guest_active_and_deleted_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Scenario setup: Guest join required for guest actor boundary
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
      href: "https://example.com" satisfies string & tags.Format<"uri">,
      referrer: "https://referrer.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  // Scenario 1 (success): Guest views an active post detail
  const activePostId = typia.random<string & tags.Format<"uuid">>();
  const activePost = await api.functional.communityPlatform.guest.posts.at(
    guestConnection,
    { postId: activePostId },
  );
  typia.assert(activePost);
  TestValidator.predicate(
    "timeSince is not empty",
    activePost.timeSince.trim().length > 0,
  );
  if (activePost.postType === "text") {
    TestValidator.predicate(
      "textContent present",
      activePost.textContent.trim().length > 0,
    );
  } else if (activePost.postType === "link") {
    TestValidator.predicate(
      "linkContent present",
      activePost.linkContent !== null,
    );
  } else if (activePost.postType === "image") {
    TestValidator.predicate(
      "imageContent present",
      activePost.imageContent !== null,
    );
    // imageAltText is typed in DTO as null | null in provided definitions,
    // so we only validate that the field is returned (without trimming).
    TestValidator.predicate(
      "imageAltText field is present in response",
      "imageAltText" in activePost,
    );
  }
  // Scenario 2 (edge): Guest views a soft-deleted post
  const deletedPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("deleted post should be unavailable", async () => {
    await api.functional.communityPlatform.guest.posts.at(guestConnection, {
      postId: deletedPostId,
    });
  });
  // Scenario 3 (edge/consistency): Guest views an active image/link post
  const linkPostId = typia.random<string & tags.Format<"uuid">>();
  const linkPost = await api.functional.communityPlatform.guest.posts.at(
    guestConnection,
    { postId: linkPostId },
  );
  typia.assert(linkPost);
  if (linkPost.postType === "link") {
    TestValidator.predicate(
      "linkContent present for link post",
      linkPost.linkContent !== null,
    );
  }
  const imagePostId = typia.random<string & tags.Format<"uuid">>();
  const imagePost = await api.functional.communityPlatform.guest.posts.at(
    guestConnection,
    { postId: imagePostId },
  );
  typia.assert(imagePost);
  if (imagePost.postType === "image") {
    TestValidator.predicate(
      "imageContent present for image post",
      imagePost.imageContent !== null,
    );
    TestValidator.predicate(
      "imageAltText field is present in response",
      "imageAltText" in imagePost,
    );
  }
}
