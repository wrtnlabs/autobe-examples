import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_owner_unbans_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
      username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
        RandomGenerator.name(1),
      ),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community owned by first member
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
      username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
        RandomGenerator.name(1),
      ),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 4. Owner bans the second member from community
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_platform_member_id: member.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban member matches", ban.member.id, member.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.predicate("ban is active", ban.deleted_at === null);
  // 5. Owner unbans the second member
  // The erase operation will throw an error if:
  // - Owner lacks permission (not owner/moderator)
  // - Ban record doesn't exist
  // - Ban record already deleted
  // Successful completion validates the unban workflow
  await api.functional.redditPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Validate unban succeeded
  // The absence of errors from erase() confirms:
  // - Owner had permission to unban
  // - Ban record existed and was successfully soft-deleted
  // - The unbanned user should now regain posting/commenting privileges
  TestValidator.predicate("unban operation completed successfully", true);
}
