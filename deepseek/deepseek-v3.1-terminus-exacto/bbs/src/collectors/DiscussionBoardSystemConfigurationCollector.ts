import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemConfigurationCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemConfiguration.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields with direct mapping
      id,
      key: props.body.key,
      value: props.body.value ?? null,
      data_type: props.body.data_type,
      description: props.body.description,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_system_configurationsCreateInput;
  }
}
