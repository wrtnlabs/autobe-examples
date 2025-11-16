import { tags } from "typia";

export namespace IPage {
  /** Page information. */
  export type IPagination = {
    /** Current page number. */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Limitation of records per a page. */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Total records in the database. */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total pages.
     *
     * Equal to {@link records} / {@link limit} with ceiling.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /** Page request data */
  export type IRequest = {
    /** Page number. */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /** Limitation of records per a page. */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
