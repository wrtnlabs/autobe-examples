import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular member account via /redditLike/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: "12345678",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Login as the member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "12345678",
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Generate a random community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member makes PATCH request to /redditLike/moderator/communities/{communityId}/review
  // Verify HTTP 403 Forbidden response
  await TestValidator.error(
    "member cannot access moderator-only endpoint",
    async () => {
      await api.functional.redditLike.moderator.communities.review.index(
        memberConnection,
        {
          communityId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
  // 5. Verify non-authenticated users (guests) receive 401 Unauthorized
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest cannot access moderator endpoint",
    async () => {
      await api.functional.redditLike.moderator.communities.review.index(
        guestConnection,
        {
          communityId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
}
