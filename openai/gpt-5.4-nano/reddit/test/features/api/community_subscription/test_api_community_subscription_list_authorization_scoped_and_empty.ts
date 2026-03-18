import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_list_authorization_scoped_and_empty(
  connection: api.IConnection,
): Promise<void> {
  // ============ Scenario A: member scoped view + empty leakage check ============
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.Format<"password">>();
  const member1Href = typia.random<string & tags.Format<"uri">>();
  const member1Referrer = typia.random<string & tags.Format<"uri">>();
  await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
    },
  });
  const member1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1LoginConnection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: member1Href,
      referrer: member1Referrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const communityA =
    await generate_random_community_platform_communities_create(
      member1LoginConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_communities_create(
      member1LoginConnection,
      {},
    );
  typia.assert(communityB);
  const member1SubA =
    await generate_random_community_platform_community_subscriptions_create(
      member1LoginConnection,
      {
        body: {
          community_id: communityA.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(member1SubA);
  const member1SubB =
    await generate_random_community_platform_community_subscriptions_create(
      member1LoginConnection,
      {
        body: {
          community_id: communityB.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(member1SubB);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.Format<"password">>();
  const member2Href = typia.random<string & tags.Format<"uri">>();
  const member2Referrer = typia.random<string & tags.Format<"uri">>();
  await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
    },
  });
  const member2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2LoginConnection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: member2Href,
      referrer: member2Referrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // member2 subscribes only to communityA
  const member2SubA =
    await generate_random_community_platform_community_subscriptions_create(
      member2LoginConnection,
      {
        body: {
          community_id: communityA.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(member2SubA);
  // Query as member1 but attempt to target member2's scope
  const member1IndexTarget: ICommunityPlatformCommunitySubscription.IRequest = {
    member_id: member2SubA.member_id,
    community_id: communityA.id,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;
  const member1IndexOutput =
    await api.functional.communityPlatform.communitySubscriptions.index(
      member1LoginConnection,
      {
        body: member1IndexTarget,
      },
    );
  typia.assert(member1IndexOutput);
  TestValidator.equals(
    "member1 pagination.limit",
    member1IndexOutput.pagination.limit,
    10,
  );
  TestValidator.equals(
    "member1 pagination.records",
    member1IndexOutput.pagination.records,
    2,
  );
  TestValidator.equals(
    "member1 returned data length",
    member1IndexOutput.data.length,
    2,
  );
  const returnedCommunityIds = member1IndexOutput.data.map(
    (x) => x.communityId,
  );
  TestValidator.predicate(
    "member1 includes communityA",
    returnedCommunityIds.includes(communityA.id),
  );
  TestValidator.predicate(
    "member1 includes communityB",
    returnedCommunityIds.includes(communityB.id),
  );
  for (const record of member1IndexOutput.data) {
    TestValidator.equals(
      "member scoped record memberId",
      record.memberId,
      member1SubA.member_id,
    );
    if (record.communityId === communityA.id) {
      TestValidator.equals(
        "communityA record isActive matches stored",
        record.isActive,
        member1SubA.is_active,
      );
    }
    if (record.communityId === communityB.id) {
      TestValidator.equals(
        "communityB record isActive matches stored",
        record.isActive,
        member1SubB.is_active,
      );
    }
  }
  // ============ Scenario B: empty page when no matching rows in member's scope ============
  const communityC =
    await generate_random_community_platform_communities_create(
      member1LoginConnection,
      {},
    );
  typia.assert(communityC);
  // member1 is NOT subscribed to communityC
  const member1EmptyTarget: ICommunityPlatformCommunitySubscription.IRequest = {
    community_id: communityC.id,
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;
  const member1EmptyOutput =
    await api.functional.communityPlatform.communitySubscriptions.index(
      member1LoginConnection,
      {
        body: member1EmptyTarget,
      },
    );
  typia.assert(member1EmptyOutput);
  TestValidator.equals(
    "member1 empty pagination.records",
    member1EmptyOutput.pagination.records,
    0,
  );
  TestValidator.equals(
    "member1 empty page data length",
    member1EmptyOutput.data.length,
    0,
  );
  // ============ Scenario C: admin can query across members ============
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const adminTarget: ICommunityPlatformCommunitySubscription.IRequest = {
    member_id: member2SubA.member_id,
    community_id: communityA.id,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;
  const adminIndexOutput =
    await api.functional.communityPlatform.communitySubscriptions.index(
      adminLoginConnection,
      {
        body: adminTarget,
      },
    );
  typia.assert(adminIndexOutput);
  TestValidator.equals(
    "admin pagination.records",
    adminIndexOutput.pagination.records,
    1,
  );
  TestValidator.equals(
    "admin returned data length",
    adminIndexOutput.data.length,
    1,
  );
  TestValidator.equals(
    "admin returned memberId",
    adminIndexOutput.data[0].memberId,
    member2SubA.member_id,
  );
  TestValidator.equals(
    "admin returned communityId",
    adminIndexOutput.data[0].communityId,
    communityA.id,
  );
  TestValidator.equals(
    "admin returned isActive matches stored",
    adminIndexOutput.data[0].isActive,
    member2SubA.is_active,
  );
}
