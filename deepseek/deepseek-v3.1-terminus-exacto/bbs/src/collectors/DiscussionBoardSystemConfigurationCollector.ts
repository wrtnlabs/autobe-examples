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
      // Primary key
      id,
      // Direct mappings from DTO
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      data_type: props.body.data_type,
      description: props.body.description,
      category: props.body.category,
      is_sensitive: props.body.is_sensitive,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Reverse relation (not applicable for creation) - REMOVED INVALID PROPERTY
    } satisfies Prisma.discussion_board_system_configurationsCreateInput;
  }
}
