import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

export async function test_api_moderation_queues_index_for_platform_admin_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register platform administrator
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 3. As platform admin, create visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: platformAdminJoinBody.ip,
      href: platformAdminJoinBody.href,
      referrer: platformAdminJoinBody.referrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = `public_visible_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible For Tests",
    description: "Visibility level for E2E moderation queue tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. As member user, create community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: memberJoinBody.ip,
      href: memberJoinBody.href,
      referrer: memberJoinBody.referrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Moderation Queue Test Community",
    description:
      "Community used to test moderation queue filtering and sorting",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. As platform admin, create membership for the member user in the community
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: platformAdminJoinBody.ip,
      href: platformAdminJoinBody.href,
      referrer: platformAdminJoinBody.referrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberUser.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 6. As platform admin, create moderation queues
  const activeDefaultName = "A Active Default";
  const pausedDefaultName = "Z Paused Default";
  const escalatedName = "M Escalated";
  const platformSevereName = "Platform Severe Global";

  const communityId = community.id;

  const activeDefaultQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: communityId,
          name: activeDefaultName,
          queue_type: "community_default",
          status: "active",
          description: "Active default queue for community",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(activeDefaultQueue);

  const pausedDefaultQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: communityId,
          name: pausedDefaultName,
          queue_type: "community_default",
          status: "paused",
          description: "Paused default queue for community",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(pausedDefaultQueue);

  const escalatedQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: communityId,
          name: escalatedName,
          queue_type: "community_escalated",
          status: "active",
          description: "Escalated queue for community",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(escalatedQueue);

  const platformSevereQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: null,
          name: platformSevereName,
          queue_type: "platform_severe",
          status: "active",
          description: "Global severe moderation queue",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(platformSevereQueue);

  // 7. First PATCH: filter by community_id, queue_type="community_default", status="active", ordered by name asc
  const pageSize = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstPage: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          queue_type: "community_default",
          status: "active",
          community_id: communityId,
          search: null,
          order_by: "name",
          order_direction: "asc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // Ensure at least one result and records >= data length
  TestValidator.predicate(
    "first filter should return at least one queue",
    data1.length > 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= data length",
    pagination1.records >= data1.length,
  );

  // Validate filters for each returned queue
  for (const item of data1) {
    TestValidator.equals(
      "community_id should match filtered community",
      item.community_id,
      communityId,
    );
    TestValidator.equals(
      "queue_type should be community_default",
      item.queue_type,
      "community_default",
    );
    TestValidator.equals("status should be active", item.status, "active");
  }

  // Validate ordering by name ascending within the page
  if (data1.length > 1) {
    const sortedNames = [...data1].map((q) => q.name).sort();
    const actualNames = data1.map((q) => q.name);
    TestValidator.equals(
      "names should be sorted ascending in first page",
      actualNames,
      sortedNames,
    );
  }

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination.current should be 1 or >= 1",
    pagination1.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should equal requested pageSize or be >= data length",
    pagination1.limit >= data1.length,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1 when records > 0",
    pagination1.records === 0
      ? pagination1.pages === 0
      : pagination1.pages >= 1,
  );

  // Optionally request second page when there are more records
  if (pagination1.pages > 1) {
    const secondPage: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
        connection,
        {
          body: {
            page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
            pageSize,
            queue_type: "community_default",
            status: "active",
            community_id: communityId,
            search: null,
            order_by: "name",
            order_direction: "asc",
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(secondPage);

    const pagination2 = secondPage.pagination;
    const data2 = secondPage.data;

    TestValidator.equals(
      "second page current index should be 2",
      pagination2.current,
      2,
    );
    for (const item of data2) {
      TestValidator.equals(
        "community_id on second page should match filtered community",
        item.community_id,
        communityId,
      );
      TestValidator.equals(
        "queue_type on second page should be community_default",
        item.queue_type,
        "community_default",
      );
      TestValidator.equals(
        "status on second page should be active",
        item.status,
        "active",
      );
    }
  }

  // 8. Second PATCH: filter for global platform_severe queues (community_id omitted)
  const severePage: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          queue_type: "platform_severe",
          status: null,
          community_id: null,
          search: null,
          order_by: "name",
          order_direction: "asc",
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(severePage);

  const severeData = severePage.data;
  TestValidator.predicate(
    "global platform_severe filter should return at least one queue",
    severeData.length > 0,
  );

  for (const item of severeData) {
    TestValidator.equals(
      "queue_type should be platform_severe",
      item.queue_type,
      "platform_severe",
    );
    TestValidator.equals(
      "community_id should be undefined or global",
      item.community_id,
      undefined,
    );
  }
}
