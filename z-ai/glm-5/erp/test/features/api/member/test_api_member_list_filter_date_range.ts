import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_list_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // Create first batch of members (3 members) and record their creation times
  const firstBatchMembers: IErpHrmMember.ISummary[] = [];
  for (let i = 0; i < 3; i++) {
    const newMemberConnection: api.IConnection = { host: connection.host };
    const newMember = await authorize_member_join(newMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: `first_batch_${i}_${RandomGenerator.name()}`,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(newMember);
    firstBatchMembers.push({
      id: newMember.id,
      email: newMember.email,
      displayName: newMember.display_name,
      avatarImage: newMember.avatar_image,
      phoneNumber: newMember.phone_number ?? null,
      createdAt: newMember.created_at,
      deletedAt: newMember.deleted_at,
    });
  }
  // Record the timestamp after first batch creation
  const middleTimestamp = new Date().toISOString();
  // Create second batch of members (2 members) after a brief moment
  const secondBatchMembers: IErpHrmMember.ISummary[] = [];
  for (let i = 0; i < 2; i++) {
    const newMemberConnection: api.IConnection = { host: connection.host };
    const newMember = await authorize_member_join(newMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: `second_batch_${i}_${RandomGenerator.name()}`,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(newMember);
    secondBatchMembers.push({
      id: newMember.id,
      email: newMember.email,
      displayName: newMember.display_name,
      avatarImage: newMember.avatar_image,
      phoneNumber: newMember.phone_number ?? null,
      createdAt: newMember.created_at,
      deletedAt: newMember.deleted_at,
    });
  }
  // Test 1: Filter by startDate - should include only second batch members
  const startDateResult = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        startDate: middleTimestamp,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(startDateResult);
  // All second batch members should be included (created_at >= middleTimestamp)
  const startDateMemberIds = startDateResult.data.map((m) => m.id);
  for (const member of secondBatchMembers) {
    TestValidator.predicate(
      `startDate filter should include second batch member ${member.id}`,
      startDateMemberIds.includes(member.id),
    );
  }
  // Verify first batch members are excluded (created_at < middleTimestamp)
  for (const member of firstBatchMembers) {
    TestValidator.predicate(
      `startDate filter should exclude first batch member ${member.id}`,
      !startDateMemberIds.includes(member.id),
    );
  }
  // Test 2: Filter by endDate - should include only first batch members
  const endDateResult = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        endDate: middleTimestamp,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(endDateResult);
  // All first batch members should be included (created_at <= middleTimestamp)
  const endDateMemberIds = endDateResult.data.map((m) => m.id);
  for (const member of firstBatchMembers) {
    TestValidator.predicate(
      `endDate filter should include first batch member ${member.id}`,
      endDateMemberIds.includes(member.id),
    );
  }
  // Verify second batch members are excluded (created_at > middleTimestamp)
  for (const member of secondBatchMembers) {
    TestValidator.predicate(
      `endDate filter should exclude second batch member ${member.id}`,
      !endDateMemberIds.includes(member.id),
    );
  }
  // Test 3: Combined date range filter - use earliest and latest timestamps
  const earliestTimestamp = firstBatchMembers[0].createdAt;
  const latestTimestamp =
    secondBatchMembers[secondBatchMembers.length - 1].createdAt;
  const rangeResult = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        startDate: earliestTimestamp,
        endDate: latestTimestamp,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(rangeResult);
  // All created members should be within the broad date range
  const allCreatedMemberIds = [
    ...firstBatchMembers.map((m) => m.id),
    ...secondBatchMembers.map((m) => m.id),
  ];
  const rangeMemberIds = rangeResult.data.map((m) => m.id);
  for (const memberId of allCreatedMemberIds) {
    TestValidator.predicate(
      `date range filter should include all created member ${memberId}`,
      rangeMemberIds.includes(memberId),
    );
  }
  // Test 4: Narrow date range - should include subset of members
  const narrowStartDate = firstBatchMembers[1].createdAt;
  const narrowEndDate = firstBatchMembers[2].createdAt;
  const narrowRangeResult = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {
        startDate: narrowStartDate,
        endDate: narrowEndDate,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(narrowRangeResult);
  // Verify that narrow range returns subset of members
  const narrowRangeMemberIds = narrowRangeResult.data.map((m) => m.id);
  TestValidator.predicate(
    "narrow date range should return subset of members",
    narrowRangeMemberIds.length <= firstBatchMembers.length,
  );
  // Members within the narrow range should be included
  for (const member of firstBatchMembers.slice(1)) {
    TestValidator.predicate(
      `narrow range should include member ${member.id} within range`,
      narrowRangeMemberIds.includes(member.id),
    );
  }
}
