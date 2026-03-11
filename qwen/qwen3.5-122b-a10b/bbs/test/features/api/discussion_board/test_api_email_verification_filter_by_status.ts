import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member - this creates a pending email verification record
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Query with is_verified=false - should return pending verification records
  const unverifiedResult =
    await api.functional.discussionBoard.member.email_verifications.index(
      memberConnection,
      {
        body: {
          is_verified: false,
          member_id: auth.id,
        } satisfies IDiscussionBoardMemberEmailVerification.IRequest,
      },
    );
  typia.assert(unverifiedResult);
  // 3. Validate that unverified query returns the pending record
  TestValidator.equals(
    "unverified query should return at least one record",
    unverifiedResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "unverified record should have null verified_at",
    unverifiedResult.data.length > 0 &&
      unverifiedResult.data[0].verified_at === null,
  );
  // 4. Query with is_verified=true - should return empty (no verified records yet)
  const verifiedResult =
    await api.functional.discussionBoard.member.email_verifications.index(
      memberConnection,
      {
        body: {
          is_verified: true,
          member_id: auth.id,
        } satisfies IDiscussionBoardMemberEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedResult);
  // 5. Validate that verified query returns empty array
  TestValidator.equals(
    "verified query should return no records before verification",
    verifiedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "verified query data array should be empty",
    verifiedResult.data.length,
    0,
  );
}
