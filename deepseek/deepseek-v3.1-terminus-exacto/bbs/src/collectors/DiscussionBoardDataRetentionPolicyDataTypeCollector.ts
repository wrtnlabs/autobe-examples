import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardDataRetentionPolicyDataTypeCollector {
  export async function collect(props: {
    body: IDiscussionBoardDataRetentionPolicyDataType.ICreate;
  }) {
    return {
      id: v4(),
      data_type: props.body.data_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      retentionPolicy: {
        connect: { id: props.body.discussion_board_data_retention_policy_id },
      },
    } satisfies Prisma.discussion_board_data_retention_policy_data_typesCreateInput;
  }
}
