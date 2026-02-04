import { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicDiscussionSectionCollector {
  export async function collect(props: {
    body: IEconomicDiscussionSection.ICreate;
    economicDiscussionAdministrators: IEntity;
    economicDiscussionAdministratorSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: "",
      description: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      createdBy: {
        connect: { id: props.economicDiscussionAdministrators.id },
      },
      updatedBy: {
        connect: { id: props.economicDiscussionAdministrators.id },
      },
      deletedBy: undefined,
    } satisfies Prisma.economic_discussion_sectionsCreateInput;
  }
}
