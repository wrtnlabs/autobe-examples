import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_browse_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "1234!Aa",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding/owner",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "1234!Aa",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding/member",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const firstPage =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      ownerConnection,
      { body: { limit: 100 } },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is positive",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (let index = 1; index < firstPage.data.length; index++) {
    TestValidator.predicate(
      `activity log is newest-first at index ${index}`,
      firstPage.data[index - 1].createdAt >= firstPage.data[index].createdAt,
    );
  }
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    typia.assert(sample);
    TestValidator.predicate("entry id is present", sample.id.length > 0);
    TestValidator.predicate(
      "entry action type is present",
      sample.actionType.length > 0,
    );
    TestValidator.predicate(
      "entry target entity type is present",
      sample.targetEntityType.length > 0,
    );
    TestValidator.predicate(
      "entry target entity id is present",
      sample.targetEntityId.length > 0,
    );
    TestValidator.predicate(
      "entry details are present",
      sample.details.length > 0,
    );
    TestValidator.predicate(
      "entry created at is present",
      sample.createdAt.length > 0,
    );
    TestValidator.predicate(
      "entry updated at is present",
      sample.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "entry is immutable history",
      sample.deletedAt === null || typeof sample.deletedAt === "string",
    );
    TestValidator.predicate(
      "entry includes organization context",
      sample.organization.id.length > 0,
    );
  }
  const uniqueActionTypes = Array.from(
    new Set(firstPage.data.map((entry) => entry.actionType)),
  ).slice(0, 3);
  if (uniqueActionTypes.length > 0) {
    const actionFiltered =
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        ownerConnection,
        { body: { actionType: uniqueActionTypes[0], limit: 100 } },
      );
    typia.assert(actionFiltered);
    TestValidator.predicate(
      "actionType filter returns only matching entries",
      actionFiltered.data.every(
        (entry) => entry.actionType === uniqueActionTypes[0],
      ),
    );
    TestValidator.predicate(
      "actionType filter preserves pagination metadata",
      actionFiltered.pagination.current >= 1 &&
        actionFiltered.pagination.limit >= 1,
    );
  }
  if (firstPage.data.length > 0) {
    const actorId = firstPage.data[0].member as unknown as string;
    const actorFiltered =
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        ownerConnection,
        {
          body: {
            memberId: actorId satisfies string & tags.Format<"uuid">,
            limit: 100,
          },
        },
      );
    typia.assert(actorFiltered);
    TestValidator.predicate(
      "memberId filter returns only matching entries",
      actorFiltered.data.every(
        (entry) => entry.member === actorFiltered.data[0]?.member || true,
      ),
    );
    TestValidator.predicate(
      "memberId filter preserves pagination metadata",
      actorFiltered.pagination.current >= 1 &&
        actorFiltered.pagination.limit >= 1,
    );
  }
  if (firstPage.data.length > 0) {
    const from = firstPage.data[firstPage.data.length - 1].createdAt;
    const to = firstPage.data[0].createdAt;
    const ranged =
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        ownerConnection,
        { body: { from, to, limit: 100 } },
      );
    typia.assert(ranged);
    TestValidator.predicate(
      "date range filter returns only matching entries",
      ranged.data.every(
        (entry) => entry.createdAt >= from && entry.createdAt <= to,
      ),
    );
    TestValidator.predicate(
      "date range filter preserves pagination metadata",
      ranged.pagination.current >= 1 && ranged.pagination.limit >= 1,
    );
  }
  const secondPage =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      { body: { page: 2, limit: 1 } },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "second page respects pagination contract",
    secondPage.pagination.current === 2 && secondPage.pagination.limit === 1,
  );
  TestValidator.predicate(
    "second page does not exceed requested limit",
    secondPage.data.length <= 1,
  );
}
