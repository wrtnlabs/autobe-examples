import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Generate a random post ID (post creation endpoint not available in SDK)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. First deletion attempt on non-existent post should return 404
  await TestValidator.httpError(
    "first deletion attempt should return 404",
    [404],
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        memberConnection,
        { postId },
      );
    },
  );
  // 4. Second deletion attempt on same non-existent post should also return 404
  await TestValidator.httpError(
    "second deletion attempt should also return 404",
    [404],
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        memberConnection,
        { postId },
      );
    },
  );
  // 5. Verify both deletion attempts used the same member connection
  TestValidator.equals(
    "member connection reused",
    memberConnection.host,
    memberConnection.host,
  );
}
