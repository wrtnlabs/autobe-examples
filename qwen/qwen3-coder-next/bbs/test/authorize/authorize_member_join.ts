import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body: IDiscussionBoardMember.IJoin;
  },
): Promise<IDiscussionBoardMember.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    displayName: props.body.displayName ?? RandomGenerator.name(),
    passwordConfirmation:
      props.body.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  return await api.functional.discussionBoard.auth.member.join(connection, {
    body: joinInput,
  });
}
