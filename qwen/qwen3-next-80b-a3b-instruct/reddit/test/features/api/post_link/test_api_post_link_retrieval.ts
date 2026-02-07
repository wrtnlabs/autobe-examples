import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_link_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secure_password_123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create a link-type post with a valid external URL
  const linkUrl = "https://example.com/article";
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "link",
        url: linkUrl,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Extract ID from the post using the IEntity interface (id property exists on the actual response)
  // ICommunityPost extends IEntity according to external definition, so id property exists
  const postId: string = (post as IEntity).id;
  // 3. Retrieve the link details using the post's ID
  const linkDetails = await api.functional.community.posts.link.at(
    memberConnection,
    {
      postId: postId,
    },
  );
  typia.assert(linkDetails);
  // 4. Validate the response contains the exact URL and domain name as originally provided
  TestValidator.equals("URL matches original", linkDetails.url, linkUrl);
  TestValidator.equals(
    "Domain name matches extracted",
    linkDetails.domain_name,
    "example.com",
  );
  // 5. Confirm the response structure matches ICommunityPostLink
  // (This is already validated by typia.assert(linkDetails) above)
}
