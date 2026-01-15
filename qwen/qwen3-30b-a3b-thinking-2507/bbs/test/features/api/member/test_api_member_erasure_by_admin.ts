import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_erasure_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin for this test using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IDiscussionBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string &
            tags.MinLength<8> &
            tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
        >(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Perform the actual erasure test
  const testMemberId = "test-member-12345";
  await api.functional.discussionBoard.admin.members.erase(adminConnection, {
    memberId: testMemberId,
  });
  // No need to verify the deletion with get since it doesn't exist in the API
}
