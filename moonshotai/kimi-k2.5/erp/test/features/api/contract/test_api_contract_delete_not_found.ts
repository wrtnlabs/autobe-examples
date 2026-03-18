import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a member
  await authorize_member_join(memberConnection, {});
  // Generate a random UUID that does not exist in the system
  const nonExistentContractId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent contract and verify 404 error
  await TestValidator.httpError(
    "delete non-existent contract returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.contracts.erase(memberConnection, {
        contractId: nonExistentContractId,
      });
    },
  );
}
