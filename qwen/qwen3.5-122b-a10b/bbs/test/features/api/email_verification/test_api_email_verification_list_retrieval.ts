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

export async function test_api_email_verification_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins - this creates an email verification record
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
  // 2. Retrieve email verification list
  const verifications =
    await api.functional.discussionBoard.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMemberEmailVerification.IRequest,
      },
    );
  typia.assert(verifications);
  // 3. Validate response structure
  TestValidator.equals(
    "has at least one verification",
    verifications.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    verifications.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", verifications.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    verifications.pagination.records > 0,
  );
  // 4. Validate verification record
  const verification = verifications.data[0];
  TestValidator.equals("member ID matches", verification.member.id, auth.id);
  TestValidator.equals(
    "member display name matches",
    verification.member.display_name,
    auth.display_name,
  );
  // 5. Verify token is NOT included in response (security)
  TestValidator.predicate(
    "token field does not exist",
    !("token" in verification),
  );
}
