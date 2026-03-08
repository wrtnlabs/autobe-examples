import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_edit_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const authConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community and subscribe
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create TEXT post
  const textPost: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(textPost);
  const initialCreatedAt: string = textPost.createdAt;
  const initialUpdatedAt: string = textPost.updatedAt;
  const initialTitle: string = textPost.title;
  const initialContent: string | null = textPost.content ?? null;
  // 4. Update TEXT post - title only
  const updatedTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const titleUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        title: updatedTitle,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(titleUpdate);
  TestValidator.equals("title updated", titleUpdate.title, updatedTitle);
  TestValidator.equals(
    "content preserved",
    titleUpdate.content,
    initialContent,
  );
  TestValidator.equals(
    "vote score preserved",
    titleUpdate.voteScore,
    textPost.voteScore,
  );
  TestValidator.equals(
    "comment count preserved",
    titleUpdate.commentCount,
    textPost.commentCount,
  );
  TestValidator.equals(
    "created_at preserved",
    titleUpdate.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "post_type preserved",
    titleUpdate.postType,
    textPost.postType,
  );
  TestValidator.equals(
    "author preserved",
    titleUpdate.author.id,
    textPost.author.id,
  );
  TestValidator.equals(
    "community preserved",
    titleUpdate.community.id,
    textPost.community.id,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    titleUpdate.updatedAt > initialUpdatedAt,
  );
  // 5. Update TEXT post - content only
  const updatedContent: string = RandomGenerator.paragraph({ sentences: 5 });
  const contentUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        content: updatedContent,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(contentUpdate);
  TestValidator.equals("title preserved", contentUpdate.title, updatedTitle);
  TestValidator.equals(
    "content updated",
    contentUpdate.content,
    updatedContent,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    contentUpdate.updatedAt > titleUpdate.updatedAt,
  );
  // 6. Create LINK post
  const linkPost: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "LINK" as const,
        redditPlatformCommunityId: community.id,
        url: typia.random<
          string & tags.Format<"uri"> & tags.MaxLength<80000>
        >(),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(linkPost);
  const initialLinkUrl: string | null = linkPost.url ?? null;
  const initialLinkTitle: string = linkPost.title;
  // 7. Update LINK post - URL only
  const updatedLinkUrl: string = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const linkUrlUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: linkPost.id,
      body: {
        url: updatedLinkUrl,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(linkUrlUpdate);
  TestValidator.equals(
    "link title preserved",
    linkUrlUpdate.title,
    initialLinkTitle,
  );
  TestValidator.equals("link url updated", linkUrlUpdate.url, updatedLinkUrl);
  TestValidator.equals("link content null", linkUrlUpdate.content, null);
  TestValidator.equals(
    "link vote score preserved",
    linkUrlUpdate.voteScore,
    linkPost.voteScore,
  );
  TestValidator.predicate(
    "link updated_at refreshed",
    linkUrlUpdate.updatedAt > linkPost.updatedAt,
  );
  // 8. Update LINK post - title only
  const updatedLinkTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const linkTitleUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: linkPost.id,
      body: {
        title: updatedLinkTitle,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(linkTitleUpdate);
  TestValidator.equals(
    "link title updated",
    linkTitleUpdate.title,
    updatedLinkTitle,
  );
  TestValidator.equals(
    "link url preserved",
    linkTitleUpdate.url,
    updatedLinkUrl,
  );
  TestValidator.equals("link content null", linkTitleUpdate.content, null);
  TestValidator.predicate(
    "link updated_at refreshed",
    linkTitleUpdate.updatedAt > linkUrlUpdate.updatedAt,
  );
  // 9. Create IMAGE post
  const imagePost: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "IMAGE" as const,
        redditPlatformCommunityId: community.id,
        imageUrl: typia.random<
          string & tags.Format<"uri"> & tags.MaxLength<80000>
        >(),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(imagePost);
  const initialImageUrl: string | null = imagePost.imageUrl ?? null;
  const initialImageTitle: string = imagePost.title;
  // 10. Update IMAGE post - image_url only
  const updatedImageUrl: string = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const imageUrlUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: imagePost.id,
      body: {
        image_url: updatedImageUrl,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(imageUrlUpdate);
  TestValidator.equals(
    "image title preserved",
    imageUrlUpdate.title,
    initialImageTitle,
  );
  TestValidator.equals(
    "image url updated",
    imageUrlUpdate.imageUrl,
    updatedImageUrl,
  );
  TestValidator.equals("image content null", imageUrlUpdate.content, null);
  TestValidator.equals(
    "image vote score preserved",
    imageUrlUpdate.voteScore,
    imagePost.voteScore,
  );
  TestValidator.predicate(
    "image updated_at refreshed",
    imageUrlUpdate.updatedAt > imagePost.updatedAt,
  );
  // 11. Update IMAGE post - title only
  const updatedImageTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const imageTitleUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: imagePost.id,
      body: {
        title: updatedImageTitle,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(imageTitleUpdate);
  TestValidator.equals(
    "image title updated",
    imageTitleUpdate.title,
    updatedImageTitle,
  );
  TestValidator.equals(
    "image url preserved",
    imageTitleUpdate.imageUrl,
    updatedImageUrl,
  );
  TestValidator.equals("image content null", imageTitleUpdate.content, null);
  TestValidator.predicate(
    "image updated_at refreshed",
    imageTitleUpdate.updatedAt > imageUrlUpdate.updatedAt,
  );
  // 12. Test author can update title on all post types (TEXT)
  const finalTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const finalUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        title: finalTitle,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(finalUpdate);
  TestValidator.equals("final title updated", finalUpdate.title, finalTitle);
  TestValidator.equals(
    "final content preserved",
    finalUpdate.content,
    updatedContent,
  );
  TestValidator.predicate(
    "final updated_at refreshed",
    finalUpdate.updatedAt > contentUpdate.updatedAt,
  );
  // 13. Test author can update content on TEXT post
  const finalContent: string = RandomGenerator.paragraph({ sentences: 5 });
  const finalContentUpdate: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.update(memberConnection, {
      postId: textPost.id,
      body: {
        content: finalContent,
      } satisfies IRedditPlatformPost.IUpdate,
    });
  typia.assert(finalContentUpdate);
  TestValidator.equals(
    "final title preserved",
    finalContentUpdate.title,
    finalTitle,
  );
  TestValidator.equals(
    "final content updated",
    finalContentUpdate.content,
    finalContent,
  );
}
