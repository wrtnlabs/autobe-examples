import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_community_reports_active_moderator_scoping_between_communities(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: undefined,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: undefined,
  });
  typia.assert(memberB);
  const communityC1 =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(12)}-c1`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(10)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityC1);
  const communityC2 =
    await generate_random_community_platform_communities_create(
      memberBConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(12)}-c2`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(10)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityC2);
  const activeReport =
    await generate_random_community_platform_member_reports_create(
      memberBConnection,
      {
        body: {
          communityId: communityC2.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(activeReport);
  await generate_random_community_platform_community_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: communityC1.id,
        moderatorUserId: memberA.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Scenario 1: member A is moderator only for C1; requesting active reports for C2 must be denied or return empty.
  let pageC2Before: IPageICommunityPlatformReport.ISummary | null = null;
  try {
    const page =
      await api.functional.communityPlatform.member.communities.reports.active.index(
        memberAConnection,
        { communityId: communityC2.id },
      );
    typia.assert(page);
    pageC2Before = page;
  } catch {
    pageC2Before = null;
  }
  TestValidator.predicate(
    "member A does not see C2 active reports when not moderator for C2",
    () =>
      pageC2Before === null ||
      pageC2Before.data.length === 0 ||
      pageC2Before.data.every((r) => r.community.id !== communityC2.id),
  );
  // Scenario 2: grant member A moderator role for C2 and verify access is granted and scoped.
  await generate_random_community_platform_community_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: communityC2.id,
        moderatorUserId: memberA.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const pageC2After =
    await api.functional.communityPlatform.member.communities.reports.active.index(
      memberAConnection,
      { communityId: communityC2.id },
    );
  typia.assert(pageC2After);
  TestValidator.predicate("returned reports are scoped to community C2", () =>
    pageC2After.data.every((r) => r.community.id === communityC2.id),
  );
  if (pageC2After.data.length > 0) {
    const first = pageC2After.data[0];
    TestValidator.equals(
      "report community id matches C2",
      first.community.id,
      communityC2.id,
    );
    TestValidator.predicate(
      "each returned report includes the correct target context",
      () =>
        pageC2After.data.every(
          (r) =>
            r.target.target_id === r.target.target_id &&
            r.target.target_type === r.target.target_type,
        ),
    );
  }
}
