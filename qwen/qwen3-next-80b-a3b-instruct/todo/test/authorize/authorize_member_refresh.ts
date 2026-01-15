import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { ITodoListMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListMember";
export async function authorize_member_refresh(
  connection: api.IConnection,
  props: {
    body: IMember.IRefresh;
  },
): Promise<ITodoListMember.IAuthorized> {
  return await api.functional.auth.member.refresh(connection, {
    body: props.body,
  });
}
