import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_blocked_from_viewing_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_community_owner_join(communityOwnerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 2. Authenticate as community owner
  await authorize_community_owner_login(communityOwnerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Generate a random report ID (since we can't create one)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 5. Authenticate as member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 6. Attempt to retrieve report as member (expected: 403 Forbidden)
  await TestValidator.httpError(
    "member should be blocked from viewing report",
    403,
    async () => {
      await api.functional.redditCommunity.communityOwner.reports.at(
        memberConnection,
        {
          reportId,
        },
      );
    },
  );
}
