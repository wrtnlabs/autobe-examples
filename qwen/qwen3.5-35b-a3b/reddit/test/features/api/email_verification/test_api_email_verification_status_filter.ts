import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Get initial verifications with 'active' status
  const initialActiveVerifications: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: joinResult.id,
          status: "active",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(initialActiveVerifications);
  // Verify at least one active verification exists
  TestValidator.predicate(
    "initial active verifications exist",
    initialActiveVerifications.data.length > 0,
  );
  // Verify all returned verifications have deleted_at IS NULL (active status)
  for (const verification of initialActiveVerifications.data) {
    typia.assert(verification);
    TestValidator.equals(
      "active verification has null deleted_at",
      verification.deleted_at,
      null,
    );
  }
  // Get expired verifications with 'expired' status filter
  const expiredVerifications: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: joinResult.id,
          status: "expired",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredVerifications);
  // Verify pagination when no expired records
  TestValidator.equals(
    "expired pagination current",
    expiredVerifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "expired pagination limit",
    expiredVerifications.pagination.limit,
    10,
  );
  TestValidator.equals(
    "expired pagination records",
    expiredVerifications.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired pagination pages",
    expiredVerifications.pagination.pages,
    0,
  );
  // Get all verifications with 'all' status filter
  const allVerifications: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: joinResult.id,
          status: "all",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(allVerifications);
  // Verify all count includes active verifications
  TestValidator.equals(
    "all count includes active verifications",
    allVerifications.data.length,
    initialActiveVerifications.data.length,
  );
  // Test with different limit values
  const customLimit: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: joinResult.id,
          status: "active",
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals(
    "custom limit pagination",
    customLimit.pagination.limit,
    5,
  );
  // Test pagination navigation
  const page2Verifications: IPageIRedditPlatformMemberEmailVerification.ISummary =
    await api.functional.redditPlatform.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: joinResult.id,
          status: "active",
          limit: 1,
          page: 2,
        } satisfies IRedditPlatformMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page2Verifications);
  TestValidator.equals(
    "page 2 pagination current",
    page2Verifications.pagination.current,
    2,
  );
}