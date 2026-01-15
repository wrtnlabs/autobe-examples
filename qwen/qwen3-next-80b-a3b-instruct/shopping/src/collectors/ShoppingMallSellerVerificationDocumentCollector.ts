import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerVerificationDocumentCollector {
  export async function collect(props: {
    body: IShoppingMallSellerVerificationDocument.ICreate;
    shoppingMallSellers: IEntity;
  }) {
    return {
      id: v4(),
      document_type: props.body.document_type,
      document_url: props.body.file_uri,
      status: "pending",
      uploaded_at: new Date(),
      reviewed_at: null,
      review_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: { id: props.shoppingMallSellers.id },
      },
    } satisfies Prisma.shopping_mall_seller_verification_documentsCreateInput;
  }
}
