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

export async function test_api_article_image_deletion_by_other_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two separate member accounts
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Use random UUIDs for article and image since no creation API exists
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member B attempts to delete the image (should be rejected due to lack of permissions)
  await TestValidator.error(
    "member B should not be able to delete member A's image",
    async () => {
      await api.functional.discussionBoard.member.articles.images.eraseImage(
        memberBConnection,
        {
          articleId: articleId,
          imageId: imageId,
        },
      );
    },
  );
}
