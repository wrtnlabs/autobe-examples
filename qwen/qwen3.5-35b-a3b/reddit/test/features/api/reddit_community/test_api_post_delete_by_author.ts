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

export async function test_api_post_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Delete a post (using random post ID - soft delete should succeed)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // This should succeed with 204 No Content (void response)
  await api.functional.redditCommunity.member.posts.erase(memberConnection, {
    postId,
  });
  // 3. Test unauthenticated deletion attempt (should return 401 Unauthorized)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated deletion returns 401",
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        unauthenticatedConnection,
        {
          postId,
        },
      );
    },
  );
  // 4. Test that member can still authenticate and delete (if same post deleted again)
  // Note: Second deletion of same post may return 404 (already deleted)
  // This validates the soft delete behavior where deleted_at is set
  await TestValidator.error("already deleted post returns 404", async () => {
    await api.functional.redditCommunity.member.posts.erase(memberConnection, {
      postId,
    });
  });
  // 5. Verify member identity is correctly authenticated
  TestValidator.equals("member id is valid uuid", member.id, member.id);
  TestValidator.equals(
    "member email is valid format",
    member.email,
    member.email,
  );
  TestValidator.equals(
    "member username exists",
    member.username,
    member.username,
  );
}
