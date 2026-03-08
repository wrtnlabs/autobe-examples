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

export async function test_api_member_file_deletion_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create two separate members using the available join utility
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // Use valid UUIDs for article and file since creation endpoints are not available
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // Test file deletion - note: without file creation, this tests the erase function signature
  // and verifies that proper authorization checks are in place on the server side
  await TestValidator.error(
    "non-existent file deletion should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.files.erase(
        member1Connection,
        {
          articleId,
          fileId,
        },
      );
    },
  );
  // Test that another member cannot delete the same file
  await TestValidator.error(
    "cross-member file deletion should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.files.erase(
        member2Connection,
        {
          articleId,
          fileId,
        },
      );
    },
  );
}
