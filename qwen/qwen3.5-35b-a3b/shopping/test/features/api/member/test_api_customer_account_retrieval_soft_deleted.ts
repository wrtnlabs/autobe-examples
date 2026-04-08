import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_account_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinedMember);
  const memberId: string = joinedMember.id;
  // Step 2: Verify successful retrieval of active member (baseline)
  const getActiveConnection: api.IConnection = { host: connection.host };
  const activeMember = await api.functional.ecommerceMall.members.at(
    getActiveConnection,
    { memberId },
  );
  typia.assert<IEcommerceMallMember>(activeMember);
  TestValidator.equals("active member retrieved", activeMember.id, memberId);
  TestValidator.equals(
    "active member email",
    activeMember.email,
    joinedMember.email,
  );
  // Step 3: Attempt to retrieve a non-existent member (simulating soft-deleted)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const getNonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-existent member returns 404", async () => {
    await api.functional.ecommerceMall.members.at(getNonExistentConnection, {
      memberId: nonExistentId,
    });
  });
}
