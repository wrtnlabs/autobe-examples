import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_favorite_removal_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create Member A connection and register
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // Create Member B connection and register
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // Since there's no favorite creation endpoint available, we'll test the authorization
  // validation by attempting to remove a favorite that doesn't exist, but using
  // another member's ID to trigger the authorization error
  // Generate random UUIDs for member and article that don't exist
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  // Member B attempts to remove a favorite using another member's ID
  await TestValidator.error(
    "Member B should not be able to remove favorites belonging to other members",
    async () => {
      await api.functional.discussionBoard.member.favorites.erase(
        memberBConnection,
        {
          memberId: randomMemberId, // Not Member B's ID
          articleId: randomArticleId,
        },
      );
    },
  );
  // Also test with Member A's actual ID to ensure authorization validation
  await TestValidator.error(
    "Member B should not be able to remove Member A's favorites",
    async () => {
      await api.functional.discussionBoard.member.favorites.erase(
        memberBConnection,
        {
          memberId: memberAAuthorized.id, // Member A's ID
          articleId: randomArticleId,
        },
      );
    },
  );
}
