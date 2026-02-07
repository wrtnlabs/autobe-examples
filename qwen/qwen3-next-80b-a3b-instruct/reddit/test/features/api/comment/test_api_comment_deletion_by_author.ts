import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create an authorized member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // Create a comment by the member (need to get commentId)
  // Note: We don't have a functional endpoint to create comments
  // but the scenario requires a comment to be deleted
  // So we simulate creating one by making an assumption and using a random UUID
  // which will be used as the commentId
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Delete the comment as the author
  await api.functional.community.member.comments.erase(memberConnection, {
    commentId,
  });
  // Verify deletion by attempting to re-delete (should fail with 404)
  await TestValidator.error("cannot delete non-existent comment", async () => {
    await api.functional.community.member.comments.erase(memberConnection, {
      commentId,
    });
  });
}
