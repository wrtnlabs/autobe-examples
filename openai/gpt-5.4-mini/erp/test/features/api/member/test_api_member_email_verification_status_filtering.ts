import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const requests: IHrmTimeTrackingMemberEmailVerification.IRequest[] = [
    {
      email: member.email,
      page: 1,
      limit: 100,
      sort: "-created_at",
    },
    {
      email: member.email,
      status: "pending",
      page: 1,
      limit: 100,
      sort: "-created_at",
    },
    {
      email: member.email,
      status: "verified",
      page: 1,
      limit: 100,
      sort: "-created_at",
    },
    {
      email: member.email,
      status: "expired",
      page: 1,
      limit: 100,
      sort: "-expired_at",
    },
  ];
  const responses = await ArrayUtil.asyncMap(requests, async (body) => {
    const output =
      await api.functional.hrmTimeTracking.member.email_verifications.index(
        memberConnection,
        { body },
      );
    typia.assert(output);
    return output;
  });
  const [allRecords, pendingRecords, verifiedRecords, expiredRecords] =
    responses;
  TestValidator.equals(
    "default pagination should reflect requested page",
    allRecords.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination should reflect requested limit",
    allRecords.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "default page records count must not exceed limit",
    allRecords.data.length <= allRecords.pagination.limit,
  );
  for (const record of allRecords.data) {
    TestValidator.equals(
      "verification member email should match filter",
      record.member.email,
      member.email,
    );
    if (record.status === "verified") {
      TestValidator.predicate(
        "verified records must have verifiedAt set",
        record.verifiedAt !== null,
      );
    } else if (record.status === "pending") {
      TestValidator.predicate(
        "pending records must not be verified",
        record.verifiedAt === null,
      );
      TestValidator.predicate(
        "pending records must not be expired",
        new Date(record.expiredAt).getTime() > Date.now(),
      );
    } else {
      TestValidator.predicate(
        "expired records must not be verified",
        record.verifiedAt === null,
      );
      TestValidator.predicate(
        "expired records must have past expiration",
        new Date(record.expiredAt).getTime() <= Date.now(),
      );
    }
  }
  for (const record of pendingRecords.data) {
    TestValidator.equals(
      "pending filter must return pending status",
      record.status,
      "pending",
    );
    TestValidator.predicate(
      "pending records must have null verifiedAt",
      record.verifiedAt === null,
    );
    TestValidator.predicate(
      "pending records must not be expired",
      new Date(record.expiredAt).getTime() > Date.now(),
    );
  }
  for (const record of verifiedRecords.data) {
    TestValidator.equals(
      "verified filter must return verified status",
      record.status,
      "verified",
    );
    TestValidator.predicate(
      "verified records must have verifiedAt set",
      record.verifiedAt !== null,
    );
  }
  for (const record of expiredRecords.data) {
    TestValidator.equals(
      "expired filter must return expired status",
      record.status,
      "expired",
    );
    TestValidator.predicate(
      "expired records must have null verifiedAt",
      record.verifiedAt === null,
    );
    TestValidator.predicate(
      "expired records must have past expiration",
      new Date(record.expiredAt).getTime() <= Date.now(),
    );
  }
  const secondPage =
    await api.functional.hrmTimeTracking.member.email_verifications.index(
      memberConnection,
      {
        body: {
          email: member.email,
          page: 2,
          limit: 1,
          sort: "-created_at",
        } satisfies IHrmTimeTrackingMemberEmailVerification.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be 1",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "second page data must not exceed limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  if (allRecords.data.length >= 2) {
    for (let i = 1; i < allRecords.data.length; ++i) {
      TestValidator.predicate(
        "created_at sorting must be descending",
        allRecords.data[i - 1].createdAt >= allRecords.data[i].createdAt,
      );
    }
  }
}
