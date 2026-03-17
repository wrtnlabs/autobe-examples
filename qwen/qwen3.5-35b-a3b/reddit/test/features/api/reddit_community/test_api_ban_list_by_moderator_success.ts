import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_list_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for moderator
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create new connection with token from join
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  // 3. Prepare ban request with pagination parameters
  const banRequest: IRedditCommunityBan.IRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  // 4. Generate a valid community ID (simulated)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 5. Fetch ban list as moderator
  const banList = await api.functional.redditCommunity.communities.bans.index(
    moderatorConnection,
    {
      communityId,
      body: banRequest,
    },
  );
  typia.assert(banList);
  // 6. Validate pagination metadata
  const pagination = banList.pagination;
  TestValidator.equals(
    "pagination current page is positive",
    pagination.current,
    pagination.current >= 0 ? pagination.current : 0,
  );
  TestValidator.equals(
    "pagination limit is positive",
    pagination.limit,
    pagination.limit > 0 ? pagination.limit : 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // 7. Validate each ban record in the data array has required structure
  typia.assert(banList.data);
  for (const ban of banList.data) {
    typia.assert(ban);
    // Validate ban record has all required fields
    const banSummary: IRedditCommunityBan.ISummary = ban;
    // Validate bannedMember has required fields
    const bannedMember: IRedditCommunityMember.ISummary =
      banSummary.bannedMember;
    typia.assert(bannedMember);
    TestValidator.predicate(
      "bannedMember id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(bannedMember.id),
    );
    TestValidator.predicate(
      "bannedMember username exists",
      bannedMember.username.length > 0,
    );
    TestValidator.predicate(
      "bannedMember created_at is valid datetime",
      /^[0-9T:.+Z-]+$/.test(bannedMember.created_at),
    );
    // Validate community has required fields
    const community: IRedditCommunityCommunity.ISummary = banSummary.community;
    typia.assert(community);
    TestValidator.predicate(
      "community id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(community.id),
    );
    TestValidator.predicate("community name exists", community.name.length > 0);
    // Validate bannedByModerator has required fields
    const bannedByModerator: IRedditCommunityModerator.ISummary =
      banSummary.bannedByModerator;
    typia.assert(bannedByModerator);
    TestValidator.predicate(
      "bannedByModerator id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(bannedByModerator.id),
    );
    // Validate ban timestamps are valid
    TestValidator.predicate(
      "ban bannedAt is valid datetime",
      /^[0-9T:.+Z-]+$/.test(banSummary.bannedAt),
    );
    TestValidator.predicate(
      "ban createdAt is valid datetime",
      /^[0-9T:.+Z-]+$/.test(banSummary.createdAt),
    );
    TestValidator.predicate(
      "ban updatedAt is valid datetime",
      /^[0-9T:.+Z-]+$/.test(banSummary.updatedAt),
    );
  }
  // 8. Validate sorting - banned_at should be in descending order
  if (banList.data.length > 1) {
    for (let i = 1; i < banList.data.length; i++) {
      const prevBan = banList.data[i - 1];
      const currBan = banList.data[i];
      TestValidator.predicate(
        "ban list sorted by banned_at descending",
        new Date(prevBan.bannedAt) >= new Date(currBan.bannedAt),
      );
    }
  }
  // 9. Validate soft-deleted bans are excluded (all returned bans should have deletedAt === null)
  for (const ban of banList.data) {
    typia.assert(ban);
    TestValidator.predicate("ban is not soft-deleted", ban.deletedAt === null);
  }
}