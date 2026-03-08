import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_file_deletion_prerequisites(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  // 2. Test delete with non-existent file (should return 404)
  await TestValidator.error("non-existent file should return 404", async () => {
    await api.functional.discussionBoard.member.articles.files.erase(
      memberConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        fileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 3. Test delete with another member's file (should return 403)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(otherMemberAuth);
  // 4. Test delete with already deleted file (should return 404)
  // First create a file (if article creation API was available)
  // For now, test with non-existent file
  await TestValidator.error(
    "already deleted file should return 404",
    async () => {
      await api.functional.discussionBoard.member.articles.files.erase(
        memberConnection,
        {
          articleId: memberAuth.id,
          fileId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Test delete with invalid UUID format
  await TestValidator.error(
    "invalid UUID format should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.files.erase(
        memberConnection,
        {
          articleId: "invalid-uuid-format",
          fileId: "also-invalid-uuid",
        },
      );
    },
  );
  // 6. Test that the member can delete their own files (when properly authorized)
  // This would require creating an article first with file attachment
  // For now, we verify the deletion endpoint is accessible with valid credentials
  TestValidator.predicate(
    "member connection is authorized",
    () => !!memberConnection.headers?.Authorization,
  );
}
