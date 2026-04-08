import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostFile";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_post_files_text_post_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(member);
  // 2. Create a text post WITHOUT files
  const textPostConnection: api.IConnection = { host: connection.host };
  const textPost = await api.functional.redditCommunity.member.posts.create(
    textPostConnection,
    {
      body: {
        title: "Test Text Post Without Files",
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 3. Retrieve files for the text post (should be empty)
  const filesConnection: api.IConnection = { host: connection.host };
  const fileList = await api.functional.redditCommunity.posts.files.index(
    filesConnection,
    {
      postId: textPost.id,
      body: {} satisfies IRedditCommunityPostFile.IRequest,
    },
  );
  typia.assert(fileList);
  // 4. Validate empty file list response
  TestValidator.equals(
    "file list pagination records should be 0",
    fileList.pagination.records,
    0,
  );
  TestValidator.equals(
    "file list pagination pages should be 0",
    fileList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "file list data should be empty array",
    fileList.data,
    [],
  );
  TestValidator.equals(
    "file list pagination current should be 1",
    fileList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "file list pagination limit should be positive",
    fileList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "file list handles empty files gracefully",
    fileList.data.length === 0,
  );
}
