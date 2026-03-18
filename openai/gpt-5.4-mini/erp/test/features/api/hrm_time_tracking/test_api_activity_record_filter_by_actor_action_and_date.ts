import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_activity_record_filter_by_actor_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const organizationConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      organizationConnection,
      {
        body: {
          name: `activity-filter-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const request: IHrmTimeTrackingActivityRecord.IRequest = {
    page: 1,
    limit: 50,
    sort: "createdAtDesc",
  };
  const page =
    await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination page matches the request",
    page.pagination.current === 1 && page.pagination.limit === 50,
  );
  TestValidator.predicate(
    "records are constrained to the active organization",
    page.data.every((record) => record.organization.id === organization.id),
  );
  TestValidator.predicate(
    "records are sorted by createdAt descending",
    page.data.every(
      (record, index, array) =>
        index === 0 ||
        new Date(array[index - 1].createdAt).getTime() >=
          new Date(record.createdAt).getTime(),
    ),
  );
  const memberFiltered =
    await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
      memberConnection,
      {
        body: {
          ...request,
          memberId: authorized.id,
        } satisfies IHrmTimeTrackingActivityRecord.IRequest,
      },
    );
  typia.assert(memberFiltered);
  TestValidator.predicate(
    "memberId filter keeps only matching actor records",
    memberFiltered.data.every((record) => record.member?.id === authorized.id),
  );
  TestValidator.predicate(
    "memberId filter remains inside the organization boundary",
    memberFiltered.data.every(
      (record) => record.organization.id === organization.id,
    ),
  );
  if (page.data.length > 0) {
    const sample = page.data[0];
    const actionFiltered =
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        memberConnection,
        {
          body: {
            ...request,
            actionType: sample.actionType,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    typia.assert(actionFiltered);
    TestValidator.predicate(
      "actionType filter returns only matching action types",
      actionFiltered.data.every(
        (record) => record.actionType === sample.actionType,
      ),
    );
    const entityTypeFiltered =
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        memberConnection,
        {
          body: {
            ...request,
            targetEntityType: sample.targetEntityType,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    typia.assert(entityTypeFiltered);
    TestValidator.predicate(
      "targetEntityType filter returns only matching records",
      entityTypeFiltered.data.every(
        (record) => record.targetEntityType === sample.targetEntityType,
      ),
    );
    if (sample.targetEntityId !== null) {
      const entityIdFiltered =
        await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
          memberConnection,
          {
            body: {
              ...request,
              targetEntityId: sample.targetEntityId,
            } satisfies IHrmTimeTrackingActivityRecord.IRequest,
          },
        );
      typia.assert(entityIdFiltered);
      TestValidator.predicate(
        "targetEntityId filter returns only matching records",
        entityIdFiltered.data.every(
          (record) => record.targetEntityId === sample.targetEntityId,
        ),
      );
    }
    if (sample.targetEntityLabel !== null) {
      const entityLabelFiltered =
        await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
          memberConnection,
          {
            body: {
              ...request,
              targetEntityLabel: sample.targetEntityLabel,
            } satisfies IHrmTimeTrackingActivityRecord.IRequest,
          },
        );
      typia.assert(entityLabelFiltered);
      TestValidator.predicate(
        "targetEntityLabel filter returns only matching records",
        entityLabelFiltered.data.every(
          (record) => record.targetEntityLabel === sample.targetEntityLabel,
        ),
      );
    }
    const keyword = RandomGenerator.substring(sample.details);
    const detailsFiltered =
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        memberConnection,
        {
          body: {
            ...request,
            details: keyword,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    typia.assert(detailsFiltered);
    TestValidator.predicate(
      "details filter returns only matching records",
      detailsFiltered.data.every((record) => record.details.includes(keyword)),
    );
    const createdAtFiltered =
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        memberConnection,
        {
          body: {
            ...request,
            createdAtFrom: sample.createdAt,
            createdAtTo: sample.createdAt,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    typia.assert(createdAtFiltered);
    TestValidator.predicate(
      "createdAt range filter keeps returned records inside the requested window",
      createdAtFiltered.data.every(
        (record) => record.createdAt === sample.createdAt,
      ),
    );
  }
  if (page.pagination.pages > 1) {
    const nextPage =
      await api.functional.hrmTimeTracking.member.hrmTimeTracking.activity_records.index(
        memberConnection,
        {
          body: {
            ...request,
            page: 2,
          } satisfies IHrmTimeTrackingActivityRecord.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.predicate(
      "second page pagination metadata is stable",
      nextPage.pagination.current === 2 && nextPage.pagination.limit === 50,
    );
    TestValidator.predicate(
      "second page remains within the selected organization",
      nextPage.data.every(
        (record) => record.organization.id === organization.id,
      ),
    );
  }
}
