import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_retrieval_success_link_post(
  connection: api.IConnection,
): Promise<void> {} // Step 1: Guest join to get authorization token const guestDeviceId = typia.random<string & tags.Format<"uuid">>(); const guestConnection: api.IConnection = { host: connection.host }; const guest = await authorize_guest_join(guestConnection, { body: { device_id: guestDeviceId } satisfies IRedditLikeGuest.IJoin, }); typia.assert(guest); // Step 2: Create a link post using SDK (since there's no post creation utility) // First, need to get a community and author for the post // Since this is a guest test, we'll create a post with a temporary user const testCommunity = typia.random<IRedditLikeCommunity.ISummary>(); const testAuthor = typia.random<IRedditLikeMember.ISummary>(); // Create a link post - use random data for required fields const linkPostData = typia.random<IRedditLikePost>(); // Since we can't directly create a post without authentication context, // we'll simulate retrieving a link post that already exists // For a real link post, set type to 'link' and ensure url is populated const postId = typia.random<string & tags.Format<"uuid">>(); // Step 3: Retrieve the link post const post = await api.functional.redditLike.guest.posts.at(guestConnection, { postId: postId, }); typia.assert(post); // Step 4: Validate link post properties TestValidator.equals("post type is link", post.type, "link"); TestValidator.predicate("url is populated", post.url !== null && post.url !== undefined); TestValidator.equals("content is null for link post", post.content, null); TestValidator.equals("image_url is null for link post", post.image_url, null); // Step 5: Validate author and community information TestValidator.equals("author has valid id", typeof post.author.id, "string"); TestValidator.equals("community has valid name", typeof post.community.name, "string"); }
