import { tags } from "typia";

import { IEcommerceMallUser } from "./IEcommerceMallUser";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IRequest = {
    /**
     * Page information.
     *
         * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
         * @x-autobe-specification List of records of type
         *   IEcommerceMallUser.IRequest.
     */
    data: IEcommerceMallUser.IRequest[];

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
         * @x-autobe-specification 1-indexed page number. Defaults to 1 if not
         *   provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
         * @x-autobe-specification Maximum records per page. Defaults to 100 if
         *   not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
         * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
         * @x-autobe-specification List of records of type
         *   IEcommerceMallUser.ISummary.
     */
    data: IEcommerceMallUser.ISummary[];
  };
}
