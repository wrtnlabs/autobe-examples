import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscription_ordering_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with delays to ensure distinct timestamps
  const communities = await ArrayUtil.asyncRepeat(6, async () => {
    const community =
      await generate_random_reddit_clone_member_communities_create(
        memberConnection,
        {},
      );
    // Add delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    return community;
  });
  typia.assert(communities);
  // 3. Subscribe to all communities with delays
  const subscriptions = await ArrayUtil.asyncRepeat(6, async (index) => {
    const subscription =
      await generate_random_reddit_clone_member_subscriptions_create(
        memberConnection,
        {
          body: { communityId: communities[index].id },
        },
      );
    // Add delay between subscriptions to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
    return subscription;
  });
  typia.assert(subscriptions);
  // 4. Test ascending order (oldest first)
  const ascResult = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        limit: 10,
        order: "asc",
      } satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(ascResult);
  TestValidator.equals(
    "ascending order - pagination exists",
    ascResult.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "ascending order - has data",
    ascResult.data.length > 0,
    true,
  );
  // Verify ascending order: each createdAt should be <= next createdAt
  for (let i = 0; i < ascResult.data.length - 1; i++) {
    const current = new Date(ascResult.data[i].createdAt).getTime();
    const next = new Date(ascResult.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `ascending order - item ${i} should have earlier or equal timestamp than item ${i + 1}`,
      current <= next,
    );
  }
  // 5. Test descending order (newest first - default)
  const descResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          limit: 10,
          order: "desc",
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(descResult);
  TestValidator.equals(
    "descending order - pagination exists",
    descResult.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "descending order - has data",
    descResult.data.length > 0,
    true,
  );
  // Verify descending order: each createdAt should be >= next createdAt
  for (let i = 0; i < descResult.data.length - 1; i++) {
    const current = new Date(descResult.data[i].createdAt).getTime();
    const next = new Date(descResult.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `descending order - item ${i} should have later or equal timestamp than item ${i + 1}`,
      current >= next,
    );
  }
  // 6. Test default order (should be descending)
  const defaultResult =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Default should match descending order
  TestValidator.equals(
    "default order matches descending order",
    defaultResult.data.length,
    descResult.data.length,
  );
  // 7. Test pagination with ascending order
  if (ascResult.pagination.pages >= 2) {
    const page1Asc =
      await api.functional.redditClone.member.subscriptions.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 3,
            order: "asc",
          } satisfies IRedditCloneSubscription.IRequest,
        },
      );
    typia.assert(page1Asc);
    const page2Asc =
      await api.functional.redditClone.member.subscriptions.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 3,
            order: "asc",
          } satisfies IRedditCloneSubscription.IRequest,
        },
      );
    typia.assert(page2Asc);
    // Page 2 ascending should have older or equal timestamps than page 1
    if (page1Asc.data.length > 0 && page2Asc.data.length > 0) {
      const page1LastTime = new Date(
        page1Asc.data[page1Asc.data.length - 1].createdAt,
      ).getTime();
      const page2FirstTime = new Date(page2Asc.data[0].createdAt).getTime();
      TestValidator.predicate(
        "page 2 ascending should have older or equal first timestamp than page 1 last timestamp",
        page2FirstTime <= page1LastTime,
      );
    }
  }
  // 8. Test pagination with descending order
  if (descResult.pagination.pages >= 2) {
    const page1Desc =
      await api.functional.redditClone.member.subscriptions.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 3,
            order: "desc",
          } satisfies IRedditCloneSubscription.IRequest,
        },
      );
    typia.assert(page1Desc);
    const page2Desc =
      await api.functional.redditClone.member.subscriptions.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 3,
            order: "desc",
          } satisfies IRedditCloneSubscription.IRequest,
        },
      );
    typia.assert(page2Desc);
    // Page 2 descending should have older timestamps than page 1
    if (page1Desc.data.length > 0 && page2Desc.data.length > 0) {
      const page1LastTime = new Date(
        page1Desc.data[page1Desc.data.length - 1].createdAt,
      ).getTime();
      const page2FirstTime = new Date(page2Desc.data[0].createdAt).getTime();
      TestValidator.predicate(
        "page 2 descending should have older first timestamp than page 1 last timestamp",
        page2FirstTime <= page1LastTime,
      );
    }
  }
}
