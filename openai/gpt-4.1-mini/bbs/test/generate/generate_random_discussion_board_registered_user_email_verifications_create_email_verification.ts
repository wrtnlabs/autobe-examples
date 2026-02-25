import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_registered_user_email_verification } from "../prepare/prepare_random_discussion_board_registered_user_email_verification";

export async function generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardRegisteredUserEmailVerification.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardRegisteredUserEmailVerification> {
  const prepared: IDiscussionBoardRegisteredUserEmailVerification.ICreate =
    prepare_random_discussion_board_registered_user_email_verification(
      props.body,
    );
  const result: IDiscussionBoardRegisteredUserEmailVerification =
    await api.functional.discussionBoard.registeredUser.emailVerifications.createEmailVerification(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
