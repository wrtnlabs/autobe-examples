import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_report_target_cross_community_scope_hidden(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ILogin;
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<string & tags.Format<"password">>();
  const firstMemberJoinBody = {
    email: firstMemberEmail,
    password: firstMemberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const firstMemberLoginBody = {
    email: firstMemberEmail,
    password: firstMemberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.ILogin;
  const firstMemberJoinConnection: api.IConnection = { host: connection.host };
  const firstMemberJoin = await authorize_member_join(
    firstMemberJoinConnection,
    {
      body: firstMemberJoinBody,
    },
  );
  typia.assert(firstMemberJoin);
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberLogin = await authorize_member_login(firstMemberConnection, {
    body: firstMemberLoginBody,
  });
  typia.assert(firstMemberLogin);
  const secondMemberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberJoin = await authorize_member_join(secondMemberConnection, {
    body: secondMemberJoinBody,
  });
  typia.assert(secondMemberJoin);
  const firstCommunity =
    await generate_random_community_platform_member_communities_create(
      firstMemberConnection,
      {
        body: {
          slug: `scope-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstCommunity);
  const secondCommunity =
    await generate_random_community_platform_member_communities_create(
      secondMemberConnection,
      {
        body: {
          slug: `scope-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(secondCommunity);
  TestValidator.notEquals(
    "communities are isolated",
    firstCommunity.id,
    secondCommunity.id,
  );
  TestValidator.notEquals(
    "community slugs are isolated",
    firstCommunity.slug,
    secondCommunity.slug,
  );
  const crossedModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const crossedModerationActionReportId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-community or mismatched moderation report target stays hidden in first community scope",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.reports.at(
        adminConnection,
        {
          communityId: firstCommunity.id,
          moderationActionId: crossedModerationActionId,
          moderationActionReportId: crossedModerationActionReportId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "same nested identifiers remain hidden when replayed under second community scope",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.reports.at(
        adminConnection,
        {
          communityId: secondCommunity.id,
          moderationActionId: crossedModerationActionId,
          moderationActionReportId: crossedModerationActionReportId,
        },
      );
    },
  );
}
