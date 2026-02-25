import { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceCancellationResponseRecordCollector {
  export async function collect(props: {
    body: IEcommerceCancellationResponseRecord.ICreate;
    ecommerceCancellationRequests: IEntity;
    ecommerceSellers: IEntity;
    ecommerceSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      decision: props.body.decision,
      response_reason: props.body.response_reason,
      responded_at: new Date(),
      created_at: new Date(),
      cancellationRequest: {
        connect: { id: props.ecommerceCancellationRequests.id },
      },
      seller: { connect: { id: props.ecommerceSellers.id } },
    } satisfies Prisma.ecommerce_cancellation_response_recordsCreateInput;
  }
}
