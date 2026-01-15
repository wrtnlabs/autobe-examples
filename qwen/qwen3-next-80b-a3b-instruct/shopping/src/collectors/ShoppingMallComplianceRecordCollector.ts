import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { IShoppingMallComplianceFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceFile";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallComplianceRecordCollector {
  export async function collect(props: {
    body: IShoppingMallComplianceRecord.ICreate;
    admin: IEntity;
  }) {
    return {
      id: v4(),
      jurisdiction: props.body.compliance_type,
      document_type: props.body.compliance_category,
      document_reference: props.body.policy_reference ?? "",
      effective_from: new Date(props.body.issue_date),
      effective_to: props.body.expiry_date
        ? new Date(props.body.expiry_date)
        : null,
      document_url: props.body.evidence_url ?? null,
      justification: props.body.notes ?? "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      admin: {
        connect: { id: props.admin.id },
      },
    } satisfies Prisma.shopping_mall_compliance_recordsCreateInput;
  }
}
