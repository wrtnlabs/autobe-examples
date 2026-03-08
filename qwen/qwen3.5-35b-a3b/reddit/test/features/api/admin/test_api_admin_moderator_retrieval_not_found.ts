import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_admin_moderator_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {} // 1. Create admin account and authenticate  const adminConnection: api.IConnection = { host: connection.host };  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(adminConnection, {    body: {      email: typia.random<string & tags.Format<"email">>(),      password: RandomGenerator.alphaNumeric(16),      username: typia.random<        string &          tags.MinLength<3> &          tags.MaxLength<20> &          tags.Pattern<"^[a-zA-Z0-9_]+$">      >(),      href: typia.random<string & tags.Format<"uri">>(),      referrer: typia.random<string & tags.Format<"uri">>(),      ip: typia.random<string & tags.Format<"ipv4">>(),    },  });  typia.assert(admin);  // 2. Create community owner member account and authenticate  const ownerConnection: api.IConnection = { host: connection.host };  const owner: IRedditPlatformMember.IAuthorized = await authorize_member_join(ownerConnection, {    body: {      email: typia.random<string & tags.Format<"email">>(),      username: typia.random<        string &          tags.MinLength<3> &          tags.MaxLength<20> &          tags.Pattern<"^[a-zA-Z0-9_]+$">      >(),      password: RandomGenerator.alphaNumeric(16),      href: typia.random<string & tags.Format<"uri">>(),      referrer: typia.random<string & tags.Format<"uri">>(),      ip: typia.random<string & tags.Format<"ipv4">>(),    },  });  typia.assert(owner);  // 3. Create non-moderator member account and authenticate  const nonModeratorConnection: api.IConnection = { host: connection.host };  const nonModerator: IRedditPlatformMember.IAuthorized = await authorize_member_join(    nonModeratorConnection,    {      body: {        email: typia.random<string & tags.Format<"email">>(),        username: typia.random<          string &          tags.MinLength<3> &          tags.MaxLength<20> &          tags.Pattern<"^[a-zA-Z0-9_]+$">        >(),        password: RandomGenerator.alphaNumeric(16),        href: typia.random<string & tags.Format<"uri">>(),        referrer: typia.random<string & tags.Format<"uri">>(),        ip: typia.random<string & tags.Format<"ipv4">>(),      },    },  );  typia.assert(nonModerator);  // 4. Owner creates a community  const community: IRedditPlatformCommunity =    await generate_random_reddit_platform_member_communities_create(ownerConnection, {    body: {      name: RandomGenerator.alphabets(8),      description: RandomGenerator.paragraph({ sentences: 2 }),    },  });  typia.assert(community);  // 5. Admin attempts to retrieve moderator info for non-moderator user (should fail with 404)  await TestValidator.httpError(    "moderator not found should return 404",    404,    async () => {      await api.functional.redditPlatform.admin.communities.moderators.at(        adminConnection,        {          communityName: community.name,          userId: nonModerator.id,        },      );    },  );}
