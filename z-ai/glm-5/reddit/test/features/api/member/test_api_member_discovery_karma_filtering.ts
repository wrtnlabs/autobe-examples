import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_discovery_karma_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection for API access
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // Create additional test members to ensure dataset exists
  await ArrayUtil.asyncRepeat(3, async () => {
    const tempConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(tempConnection, {});
  });
  // Test 1: minKarma filtering - get members with karma >= 0
  const minKarmaResult = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        minKarma: 0,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(minKarmaResult);
  TestValidator.predicate(
    "minKarma filter returns valid pagination",
    minKarmaResult.pagination.current >= 0,
  );
  minKarmaResult.data.forEach((member) => {
    TestValidator.predicate(
      `Member ${member.username} has karma >= 0`,
      member.karma >= 0,
    );
  });
  // Test 2: maxKarma filtering - get members with karma <= 10
  const maxKarmaResult = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        maxKarma: 10,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(maxKarmaResult);
  maxKarmaResult.data.forEach((member) => {
    TestValidator.predicate(
      `Member ${member.username} has karma <= 10`,
      member.karma <= 10,
    );
  });
  // Test 3: Range filtering - both minKarma and maxKarma
  const rangeResult = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        minKarma: -5,
        maxKarma: 5,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(rangeResult);
  rangeResult.data.forEach((member) => {
    TestValidator.predicate(
      `Member ${member.username} karma within range [-5, 5]`,
      member.karma >= -5 && member.karma <= 5,
    );
  });
  // Test 4: Edge case - negative karma range filtering
  const negativeKarmaResult =
    await api.functional.communityPlatform.members.index(memberConnection, {
      body: {
        minKarma: -100,
        maxKarma: -1,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(negativeKarmaResult);
  // All returned members should have negative karma in range
  negativeKarmaResult.data.forEach((member) => {
    TestValidator.predicate(
      `Member ${member.username} has negative karma in range [-100, -1]`,
      member.karma >= -100 && member.karma <= -1,
    );
  });
  // Test 5: Validate pagination structure
  const paginationResult = await api.functional.communityPlatform.members.index(
    memberConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    paginationResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationResult.pagination.pages >= 0,
  );
}
